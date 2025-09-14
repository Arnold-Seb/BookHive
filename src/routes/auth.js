import { Router } from 'express';
const router = Router();

router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login', form: {} }); // <-- add form
});

router.get('/signup', (req, res) => {
  res.render('auth/signup', { title: 'Sign up', form: {} });
});


// POST handlers (stubs)
router.post('/login', (req, res) => {
  res.send('Login POST handler');
});

router.post('/signup', (req, res) => {
  res.send('Signup POST handler');
});

export default router;
