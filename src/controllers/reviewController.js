// src/controllers/reviewController.js
import Review from "../models/Review.js";                     //import Review model             
import Book from "../models/Book.js";                      //import Book model                

/** Recompute and store ratingAvg / ratingCount on Book */
async function recomputeBookRating(bookId) {                                //recompute average rating and count for a book           
  const agg = await Review.aggregate([                          //aggregate reviews for the book                                                                                                                  
    { $match: { bookId } },                             //match reviews for the given bookId                                                    
    { $group: { _id: "$bookId", avg: { $avg: "$rating" }, count: { $sum: 1 } } }  //group by bookId, compute average rating and count
  ]);                                             
  const { avg = 0, count = 0 } = agg[0] || {};  //extract avg and count, default to 0 if no reviews
  await Book.findByIdAndUpdate(bookId, { ratingAvg: avg, ratingCount: count }, { new: false });     //update Book with new avg and count
}

/** GET /api/books/:id/reviews (public) */
export async function listReviews(req, res) { //list all reviews for a book
  try {                                 
    const { id } = req.params;                            //bookId from URL params
    const items = await Review.find({ bookId: id })       //find all reviews for the book
      .populate("userId", "name email") //populate user info (name, email) from User model  
      .sort({ createdAt: -1 })  //newest first
      .lean();  //lean for plain JS objects
    res.json(items);  //return reviews as JSON
  } catch (e) {                                                               
    console.error("[REVIEWS] list error:", e);                 //log error for debugging        
    res.status(500).json({ message: "Failed to load reviews" });  //generic error message
  }
}

/** POST /api/books/:id/reviews (auth) — create or update current user's review */
export async function upsertMyReview(req, res) {  //create or update the authenticated user's review for a book
  try {
    const { id } = req.params; // bookId  from URL params
    const userId = req.user?.id;            // userId from authenticated user info  
    if (!userId) return res.status(401).json({ message: "Not authenticated" }); //401 if not authenticated

    let { rating, comment } = req.body; // get rating and comment from request body
    rating = Number(rating);  //convert rating to number
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {                                                                                                                                                                                                                                                                                                                                                                      
      return res.status(400).json({ message: "Rating must be 1–5" }); //400 if rating invalid 
    }
    comment = (comment || "").trim(); //trim comment, default to empty string

    const doc = await Review.findOneAndUpdate(              //upsert review (create or update)
      { bookId: id, userId },     //match by bookId and userId
      { $set: { rating, comment } },        //set new rating and comment
      { new: true, upsert: true, setDefaultsOnInsert: true }          //return new doc, create if not exists, apply defaults
    );

    await recomputeBookRating(doc.bookId);  //recompute book rating after upsert
    const updatedBook = await Book.findById(id).lean();     //fetch updated book info
    res.status(201).json({ message: "Review saved", review: doc, bookRating: { avg: updatedBook.ratingAvg, count: updatedBook.ratingCount } }); //return success with review and updated book rating
  } catch (e) {                                         
    // handle duplicate key (unique index) retries gracefully if needed
    console.error("[REVIEWS] upsert error:", e);        //log error for debugging
    res.status(500).json({ message: "Failed to save review" }); //generic error message
  }
}

/** DELETE /api/books/:id/reviews/my (auth) — remove my review */
export async function deleteMyReview(req, res) {  //delete the authenticated user's review for a book
  try {
    const { id } = req.params;  // bookId from URL params
    const userId = req.user?.id;        // userId from authenticated user info
    if (!userId) return res.status(401).json({ message: "Not authenticated" }); //401 if not authenticated

    const removed = await Review.findOneAndDelete({ bookId: id, userId });  //find and delete the review
    await recomputeBookRating(id);  //recompute book rating after deletion
    res.json({ message: removed ? "Review deleted" : "No review to delete" });        //confirm deletion or no review found 
  } catch (e) {                                     
    console.error("[REVIEWS] delete error:", e);      //log error for debugging
    res.status(500).json({ message: "Failed to delete review" }); //generic error message
  }
}
