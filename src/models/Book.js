import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title:   { type: String, required: true, trim: true },
    author:  { type: String, required: true, trim: true },
    genre:   { type: String, required: true, trim: true },
    quantity:{ type: Number, required: true, min: 0, default: 1 },

    // PDF stored as base64
    pdfData: { type: String, default: null }, 
    pdfName: { type: String, default: null }, 

    // status field
    status: { type: String, enum: ["online", "offline"], default: "offline" },

    // borrowed tracking
    borrowedBy: [{ type: String, default: [] }],  // store user emails

    // helper fields
    titleLower:  { type: String },
    authorLower: { type: String },
    genreLower:  { type: String }
  },
  { timestamps: true }
);

// before save
bookSchema.pre("save", function (next) {
  if (this.title)  this.titleLower  = this.title.toLowerCase();
  if (this.author) this.authorLower = this.author.toLowerCase();
  if (this.genre)  this.genreLower  = this.genre.toLowerCase();
  next();
});

// before update
bookSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.title)  update.titleLower  = update.title.toLowerCase();
  if (update.author) update.authorLower = update.author.toLowerCase();
  if (update.genre)  update.genreLower  = update.genre.toLowerCase();
  next();
});

// Virtual availability
bookSchema.virtual("available").get(function () {
  return this.quantity > 0;
});

export default mongoose.models.Book || mongoose.model("Book", bookSchema);
