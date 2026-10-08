import test from 'node:test';
import assert from 'node:assert/strict';
import {nextRevision,serializeProgress} from '../sync-core.js';
test('new documents and sequential saves advance their revision',()=>{
 assert.equal(nextRevision(0,0),1);assert.equal(nextRevision(4,4),5);
});
test('stale devices cannot overwrite newer progress',()=>{
 assert.throws(()=>nextRevision(5,4),{code:'sync/conflict'});
});
test('unicode notes respect the database byte limit',()=>{
 assert.equal(JSON.parse(serializeProgress({notes:'Hello 🌍'})).notes,'Hello 🌍');
 assert.throws(()=>serializeProgress({notes:'🌍'.repeat(180000)}),/too large/);
});
