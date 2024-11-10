import express from 'express';
import FAQ from '../models/FAQ';
import { authMiddleware, isAdminOrEditor } from '../middleware/auth';

const router = express.Router();

router.get('/', authMiddleware, async (req: any, res) => {
  try {
    let query = {};
    if (!req.user) {
      // If user is not logged in, only fetch public FAQs
      query = { visibility: 'public' };
    }
    // If user is logged in, fetch all FAQs (both public and internal)
    const faqs = await FAQ.find(query).populate('createdBy updatedBy', 'username');
    res.json(faqs);
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ message: 'Error fetching FAQs', error: (error as any).message });
  }
});


router.post('/', authMiddleware, isAdminOrEditor, async (req: any, res) => {
  console.log('====================================');
  console.log('req.body', req.body);
  console.log('====================================');
  try {
    const { question, answer, category, visibility } = req.body;
   
    const faq = new FAQ({
      question,
      answer,
      category,
      visibility: visibility || 'public', // Set a default if not provided
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
    });
    const savedFaq = await faq.save();
    res.status(201).json(savedFaq);
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ message: 'Error creating FAQ', error: (error as any).message });
  }
});



router.put('/:id', authMiddleware, isAdminOrEditor, async (req: any, res) => {
  try {
    const { question, answer, category, isPinned, visibility } = req.body;
    const faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      { 
        question, 
        answer, 
        category, 
        isPinned, 
        visibility: visibility || 'public', // Set a default if not provided
        updatedBy: req.user.userId 
      },
      { new: true }
    );
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    res.json(faq);
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ message: 'Error updating FAQ', error: error.message });
  }
});


router.delete('/:id', authMiddleware, isAdminOrEditor, async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting FAQ', error });
  }
});

router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const faq = await FAQ.findById(req.params.id);
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    faq.comments.push({ userId: req.user.userId, content });
    await faq.save();
    res.status(201).json(faq);
  } catch (error) {
    res.status(500).json({ message: 'Error adding comment', error });
  }
});

export default router;