/* eslint-env jest */
// Verifies that the services barrel re-exports all named service singletons.
// Importing the module is enough to generate coverage on the re-export file.
import {
  authService,
  profileService,
  preferenceService,
  dashboardService,
  appointmentService,
  appointmentAssetService,
  medicationService,
  chatService,
  chatRealtimeService,
  notificationService,
  reminderService,
  visitBriefService,
  mealService,
  prescriptionAssetService,
  nutritionService,
  planService,
  reportService,
  riskService,
  healthGoalService,
  deviceService,
  emergencyService,
  securityService,
} from '../api/services';

describe('api/services barrel', () => {
  it('exports all service singletons', () => {
    const exports = {
      authService,
      profileService,
      preferenceService,
      dashboardService,
      appointmentService,
      appointmentAssetService,
      medicationService,
      chatService,
      chatRealtimeService,
      notificationService,
      reminderService,
      visitBriefService,
      mealService,
      prescriptionAssetService,
      nutritionService,
      planService,
      reportService,
      riskService,
      healthGoalService,
      deviceService,
      emergencyService,
      securityService,
    };
    for (const [name, value] of Object.entries(exports)) {
      expect(value).toBeDefined();
      expect(typeof value).toBe('object');
      // Each service is an object with at least one method
      expect(Object.keys(value as object).length).toBeGreaterThan(0);
      // Reference name to satisfy no-unused-vars
      expect(name).toBeTruthy();
    }
  });
});
