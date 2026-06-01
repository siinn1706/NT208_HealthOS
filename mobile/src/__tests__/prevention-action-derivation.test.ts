/* eslint-env jest */
import { riskTipsToActions } from '../components/insights/risk/prevention-action-derivation';

describe('riskTipsToActions', () => {
  it('uses Core tip ids before generated risk-index ids', () => {
    const actions = riskTipsToActions({
      risks: [{
        id: 'risk-hypertension',
        condition: 'hypertension',
        level: 'high',
        probability: 0.62,
        tips: [
          { id: 'tip-sodium', priority: 'high', title: 'reduce sodium', description: 'choose low salt meals' },
          { priority: 'low', title: 'walk daily', description: 'increase step count' },
        ],
      }],
    });

    expect(actions.map((action) => action.id)).toEqual(['tip-sodium', 'risk-hypertension-1']);
  });
});
