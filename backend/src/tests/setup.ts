// Global test setup — runs before every test file.
// Sets required environment variables so the app can be imported
// without crashing on missing secrets or attempting real DB connections.

process.env.NODE_ENV                = 'test';
process.env.JWT_SECRET              = 'datiam-test-jwt-secret-do-not-use-in-prod';
process.env.DATABASE_URL            = 'postgresql://test:test@localhost:5432/datiam_test';
process.env.ANTHROPIC_API_KEY       = 'sk-test-mock-key';
process.env.ADMIN_EMAIL             = 'admin@datiam-test.com';
process.env.ADMIN_PASSWORD          = 'testadmin123!';  // min 8 chars — test only
process.env.ALLOW_SERVER_TO_SERVER  = 'true';           // supertest sends no Origin header
// No REDIS_URL → all BullMQ queues are null and workers skip gracefully
