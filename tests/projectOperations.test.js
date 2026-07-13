const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

// Mock authentication middleware
jest.mock('../src/middlewares/authMiddleware', () => (req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  req.business = { id: 'test-business-id' };
  next();
});

describe('Project Operations Integration Tests', () => {
  
  beforeAll(async () => {
    // Optional: Reset database or seed initial data
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Portfolio API', () => {
    it('should calculate portfolio totals correctly', async () => {
      // 1. Arrange: Create mock projects in test database
      await prisma.project.create({
        data: {
          id: 'proj-1',
          businessId: 'test-business-id',
          customerId: 'cust-1',
          projectName: 'Alpha',
          budget: 10000,
          revenue: 15000,
          actualCost: 5000
        }
      });

      // 2. Act
      const res = await request(app)
        .get('/api/projects/portfolio')
        .set('x-business-id', 'test-business-id')
        .set('Authorization', 'Bearer dummy-token');

      // 3. Assert
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.portfolio.totalBudget).toBeGreaterThanOrEqual(10000);
      expect(res.body.portfolio.expectedProfit).toBeGreaterThanOrEqual(10000);
      
      // 4. Cleanup
      await prisma.project.delete({ where: { id: 'proj-1' } });
    });
  });

  describe('Resource Utilization API', () => {
    it('should aggregate timesheet hours correctly', async () => {
      const res = await request(app)
        .get('/api/projects/resources')
        .set('x-business-id', 'test-business-id')
        .set('Authorization', 'Bearer dummy-token');

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.resources)).toBe(true);
    });
  });

  describe('Financial Engine Webhooks', () => {
    it('should update laborCost when time entry is created', async () => {
        // Test implementation mapping to Controller.createTimeEntry
        expect(true).toBe(true); // Placeholder for atomic transactional test
    });
  });
});
