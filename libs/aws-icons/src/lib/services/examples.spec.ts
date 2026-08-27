import { EXAMPLE_PROJECTS } from './examples';
import { validateDiagram } from './validation';

describe('EXAMPLE_PROJECTS', () => {
  EXAMPLE_PROJECTS.forEach((example) => {
    it(`${example.name} builds without errors`, () => {
      const state = example.build();
      expect(state.nodes.length).toBeGreaterThan(3);
      expect(state.edges.length).toBeGreaterThan(0);
      const errors = validateDiagram(state.nodes, state.edges).filter(
        (i) => i.level === 'error',
      );
      expect(errors).toEqual([]);
    });
  });
});
