import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAssessmentItems, copyReference, getAssessmentDefinitions } from './assessments';

test('every Check-in question that copies a bar has a picture to copy from, whatever the form and seed', () => {
  let copyItems = 0;
  for (const definition of getAssessmentDefinitions()) {
    for (let seed = 1; seed <= 25; seed++) {
      for (const item of buildAssessmentItems(definition, seed)) {
        const { model, task, picture } = item.problem;
        if (model?.kind !== 'bar' || task?.kind !== 'copy') continue;
        copyItems++;
        const reference = copyReference(item.problem);
        assert.ok(reference, `${definition.id} seed ${seed} ${item.missionId}: "${item.prompt}" has nothing to copy from`);
        assert.equal(reference.kind, picture ? 'picture' : 'bar');
      }
    }
  }
  assert.ok(copyItems > 100, 'the copy questions were found');
});

test('only a bar copy task needs a reference: counting and shading show their own bar', () => {
  for (const definition of getAssessmentDefinitions()) {
    for (const item of buildAssessmentItems(definition, 3)) {
      const { model, task } = item.problem;
      if (model?.kind === 'bar' && task && task.kind !== 'copy') assert.equal(copyReference(item.problem), undefined, `${item.missionId}: ${task.kind}`);
    }
  }
});
