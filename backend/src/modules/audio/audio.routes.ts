import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../../middleware/auth';
import * as audioController from './audio.controller';
import { ALLOWED_AUDIO_MIME_TYPES, MAX_AUDIO_FILE_SIZE } from './audio.schema';

const router = Router();
router.use(authenticate);

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if ((ALLOWED_AUDIO_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio type: ${file.mimetype}`));
    }
  },
});

const canWrite = requireRole('owner', 'admin', 'editor', 'team');

// POST /api/audio/upload   — multipart/form-data: file, artist_id, [song_id]
router.post('/upload', canWrite, multerUpload.single('file'), audioController.uploadAudio);

// POST /api/audio/process  — { upload_id }
router.post('/process', canWrite, audioController.processAudio);

// POST /api/audio/stems    — multipart/form-data: file, upload_id, artist_id, stem_type
router.post('/stems', canWrite, multerUpload.single('file'), audioController.uploadAudioStem);

// GET  /api/audio          — ?artist_id=...&limit=...
router.get('/', audioController.listUploads);

// GET  /api/audio/:id
router.get('/:id', audioController.getAudioById);

// GET  /api/audio/:id/analysis
router.get('/:id/analysis', audioController.getAudioAnalysis);

export default router;
