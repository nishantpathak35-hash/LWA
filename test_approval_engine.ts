import { approvalEngine } from './src/modules/core/services/ApprovalEngine.ts';

console.log("Test 4: Pending Procurement -> Finance + Admin");
console.log(approvalEngine.getNextStage('Pending Procurement', ['finance', 'admin']));
