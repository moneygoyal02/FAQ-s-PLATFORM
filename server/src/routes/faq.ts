import express from 'express';
import FAQ from '../models/FAQ';
import { authMiddleware, isAdminOrEditor } from '../middleware/auth';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const faqs = await FAQ.find().populate('createdBy updatedBy', 'username');
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching FAQs', error });
  }
});

router.post('/', authMiddleware, isAdminOrEditor, async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    const faq = new FAQ({
      question,
      answer,
      category,
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
    });
    await faq.save();
    res.status(201).json(faq);
  } catch (error) {
    res.status(500).json({ message: 'Error creating FAQ', error });
  }
});

router.put('/:id', authMiddleware, isAdminOrEditor, async (req, res) => {
  try {
    const { question, answer, category, isPinned } = req.body;
    const faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      { question, answer, category, isPinned, updatedBy: req.user.userId },
      { new: true }
    );
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    res.json(faq);
  } catch (error) {
    res.status(500).json({ message: 'Error updating FAQ', error });
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