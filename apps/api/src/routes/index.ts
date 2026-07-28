import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import reposRoutes from './repos.routes';
import gitRoutes from './git.routes';
import issuesRoutes from './issues.routes';
import pullsRoutes from './pulls.routes';
import notificationsRoutes from './notifications.routes';
import searchRoutes from './search.routes';
import aiRoutes from './ai.routes';
import uploadRoutes from './upload.routes';
import workflowsRoutes from './workflows.routes';
import gistsRoutes from './gists.routes';
import wikiRoutes from './wiki.routes';
import discussionsRoutes from './discussions.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/repos', reposRoutes);
router.use('/git', gitRoutes);
router.use('/issues', issuesRoutes);
router.use('/pulls', pullsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/search', searchRoutes);
router.use('/ai', aiRoutes);
router.use('/upload', uploadRoutes);
router.use('/workflows', workflowsRoutes);
router.use('/gists', gistsRoutes);
router.use('/wiki', wikiRoutes);
router.use('/discussions', discussionsRoutes);

// Health check
router.get('/health', (_, res) => {
  res.json({ success: true, message: 'PakHub API is running 🚀', timestamp: new Date().toISOString() });
});

export default router;
