const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const load = require('./security/load-module.cjs');

const admin = { email: 'reviewer@example.test', roles: ['admin'] };
function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  const db = {
    queryAll: async (sql, args = []) => sqlite.prepare(sql).all(...args),
    queryGet: async (sql, args = []) => sqlite.prepare(sql).get(...args),
    queryRun: async (sql, args = []) => {
      const result = sqlite.prepare(sql).run(...args);
      return { ...result, rowsAffected: result.changes };
    },
    withWriteTransaction: async work => {
      sqlite.exec('BEGIN');
      try { const result = await work(); sqlite.exec('COMMIT'); return result; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    }
  };
  return { sqlite, db };
}

test('both PO routes reserve inside the save transaction and an over-order rolls everything back', async t => {
  const { db, sqlite } = fixture(t);
  sqlite.exec(`
    CREATE TABLE boq_headers (id, project);
    CREATE TABLE boq_versions (id, boq_id);
    CREATE TABLE boq_items (id, description, boq_version_id, quantity, committed_qty);
    CREATE TABLE boq_po_links (id,boq_id,boq_version_id,boq_item_id,po_no,linked_qty,po_rate,po_amount,link_type,status,created_by,created_at);
    CREATE TABLE po_items (po_no, boq_item_id, qty);
    CREATE TABLE purchase_orders (po_no PRIMARY KEY);
    INSERT INTO boq_headers VALUES ('b','Site A');
    INSERT INTO boq_versions VALUES ('v','b');
    INSERT INTO boq_items VALUES ('i','Gypsum ceiling','v',100,0);`);
  const poService = { createPO: async p => {
    await db.queryRun('INSERT INTO purchase_orders VALUES (?)', [p.poNo]);
    return { poNo: p.poNo };
  }};
  const { savePO } = load('app/lib/api/purchase-orders/write.js', {
    '../../db.js': db, '../../email.js': {}, '../core.js': {}, '../notifications.js': {},
    '../../broadcast.js': { emitBroadcast: async () => {} }, '../../config.js': {},
    '../../../../src/modules/purchase-orders/services/POService': { POService: poService },
    '../../../../src/modules/core/services/AuthService': { AuthService: { requireAuth: () => {} } },
    '../../../../src/modules/vendors/repositories/VendorRepository': {}
  });
  function order(poNo, qty) {
    return savePO({ poNo, project: 'Site A', items: [{ boq_item_id: 'i', qty, rate: 230 }] }, admin);
  }
  sqlite.exec("INSERT INTO po_items VALUES ('LEGACY','i',5)");
  await order('PO-A', 70);
  await assert.rejects(order('PO-A', 10), /UNIQUE/);
  await assert.rejects(order('PO-B', 31), /remaining BOQ/);
  await order('PO-B', 25);
  await assert.rejects(order('PO-C', 1), /remaining BOQ/);
  assert.equal((await db.queryGet('SELECT committed_qty FROM boq_items')).committed_qty, 95);
  assert.equal((await db.queryAll('SELECT * FROM boq_po_links')).length, 2);
});

test('DPR create, remark edit, quantity correction and rejection preserve other reports', async t => {
  const { db, sqlite } = fixture(t);
  sqlite.exec(`
    CREATE TABLE schedule_tasks (id, project, actual_qty, progress_pct, status, linked_dpr_id, completion_date, completed_by, delay_reason, blockers, updated_at);
    CREATE TABLE schedule_task_history (id,task_id,action,changed_by,prev_progress,new_progress,prev_status,new_status,dpr_id,created_at);
    INSERT INTO schedule_tasks (id,project,actual_qty,progress_pct,status) VALUES ('task','Site A',2,5,'In Progress');`);
  const { syncReportTasks } = load('app/lib/api/dpr-progress.js', { '../db.js': db });
  const report = (id, qty, progress) => ({ id, project: 'Site A', date: '2026-11-20', approval_status: 'Submitted',
    data: { floors: [{ workDone: [{ schedule_task_id: 'task', executed_qty: qty, progress_pct: progress }] }] } });
  const first = report('1',10,50);
  const second = report('2',4,100);
  const sync = (old, next) => db.withWriteTransaction(() => syncReportTasks(old,next,admin));
  const task = () => db.queryGet('SELECT * FROM schedule_tasks');
  await sync(null, { ...first, approval_status: 'Draft' });
  assert.equal((await task()).actual_qty, 2);
  await sync(null,first);
  await sync(first, { ...first, remarks: 'Photo added' });
  assert.equal((await task()).actual_qty, 12);
  await sync(first,report('1',8,40));
  await sync(null,second);
  assert.equal((await task()).actual_qty, 14);
  assert.equal((await task()).status, 'Completed');
  await sync(second,{ ...second, approval_status: 'Rejected' });
  assert.equal((await task()).actual_qty, 10);
  assert.equal((await task()).progress_pct, 40);
  await sync(report('1',8,40),null);
  assert.equal((await task()).actual_qty, 2);
  assert.equal((await task()).progress_pct, 5);
});

test('HRMS dispatcher supplies session to the handler for dashboard, payroll and leave review', async () => {
  const { dispatchRpc } = load('app/lib/rpc-dispatch.js');
  for (const [method, args] of [['getHrmsDashboardKPIs',[]], ['getMonthlyPayrollAttendance',[{ month:11 }]], ['reviewLeaveRequest',[{ action:'approve' }]]]) {
    const api = { getMySession: async () => admin, [method]: (payload,session) => ({payload,session}) };
    const result = await dispatchRpc(api,{method,args},{headers:new Headers({'x-lwa-token':'fixture'})});
    assert.equal(result.session, admin);
    assert.deepEqual(result.payload,args[0]);
  }
});

test('payroll preserves the selected cutoff, employee scope and payable days after locking', async t => {
  const { sqlite, db } = fixture(t);
  sqlite.exec(`
    CREATE TABLE site_employees(employee_id, name, email, user_email, status, designation, department);
    CREATE TABLE site_project_allocations(employee_id, project, is_primary, status);
    CREATE TABLE site_attendance_records(id INTEGER PRIMARY KEY, employee_id, employee_name, project, date, status,
      flag_reason, total_hours, punch_in_time, punch_out_time);
    INSERT INTO site_employees VALUES ('a','A','a@test','','active','Engineer','Design'),('b','B','b@test','','active','Lead','Sales');
    INSERT INTO site_project_allocations VALUES ('a','Mumbai',1,'active');`);
  const hr = load('app/lib/api/hrms.js', { '../db.js': db, '../config.js': { isSuperAdmin: () => false },
    './attendance.js': { initSiteAttendanceTables: async () => {} } });
  await hr.initHrmsTables();
  sqlite.exec(`
    INSERT INTO hrms_holidays(title,date,year,location) VALUES ('Local','2026-11-11',2026,'Delhi');
    INSERT INTO hrms_leave_balances(employee_id,leave_type_code,year,balance) VALUES ('a','CL',2026,1);
    INSERT INTO site_attendance_records(employee_id,project,date,status,punch_in_time,punch_out_time)
      VALUES ('a','Mumbai','2026-11-10','present','2026-11-10T10:00:00+05:30','2026-11-10T17:00:00+05:30');`);
  const apply = (date, half) => hr.applyLeave({ employee_id:'a', leave_type_code:'CL', start_date:date, end_date:date, is_half_day:half }, admin);
  await apply('2026-11-12', true);
  await assert.rejects(apply('2026-11-13', false), /balance/);
  const approve = id => hr.reviewLeaveRequest({ request_id:id, action:'approve' }, admin);
  await approve(1);
  await apply('2026-11-13', true);
  const params = { year:2026, month:11, project:'Mumbai', department:'Design', cutoff_type:'26th_to_25th' };
  const report = () => hr.getMonthlyPayrollAttendance(params, admin);
  const before = await report();
  assert.deepEqual(before.summary.map(row => row.employee_id), ['a']);
  assert.equal(before.summary[0].paid_leave_days, 0.5);
  assert.equal(before.summary[0].late_arrivals, 1);
  assert.equal(before.summary[0].early_departures, 1);
  assert.equal(before.dailyMatrix.a['2026-11-11'].code, 'A');
  await hr.lockMonthlyAttendance({ ...params, action:'lock' }, admin);
  await assert.rejects(approve(2), /Unlock/);
  sqlite.exec("UPDATE site_attendance_records SET status='present' WHERE date='2026-11-12'");
  const after = await hr.getMonthlyPayrollAttendance({ ...params, cutoff_type:'calendar' }, admin);
  assert.equal(after.startDate, '2026-10-26');
  assert.equal(after.isLocked, true);
  assert.deepEqual(after.summary, before.summary);
  assert.deepEqual(after.dailyMatrix, before.dailyMatrix);
});

test('contract lookup respects unit, quantity and expiry and a failed edit preserves existing prices', async t => {
  const { sqlite, db } = fixture(t);
  db.queryBatch = async statements => {
    for (const st of statements) await db.queryRun(st.sql, st.args);
  };
  const contracts = load('app/lib/api/rate-contracts.js', { '../db.js': db, './core.js': { logAudit: async () => {} } });
  const item = { id:'sheet', item_name:'Gypsum', item_code:'g', unit:'sheet', agreed_rate:80, tax_pct:18 };
  const payload = { contract_no:'RC1', vendor_name:'Vendor', valid_from:'2020-01-01', valid_until:'2099-12-31',
    items:[item, { ...item, id:'box', unit:'box', agreed_rate:10 }, { ...item,id:'bulk',min_qty:100,agreed_rate:20 }] };
  const { id } = await contracts.saveRateContract(payload, admin);
  assert.equal((await contracts.getRateContract(id, admin)).approval_status, 'Draft');
  await assert.rejects(contracts.approveRateContract(id, admin), /different editor/);
  await contracts.approveRateContract(id, { email: 'director@example.test', roles: ['director'] });
  const matches = await contracts.getEligibleRateContractsForPO({ vendor:'Vendor',item_code:'g',unit:'sheet',qty:1 }, admin);
  assert.deepEqual(matches.contractMatches.map(row => row.id), ['sheet']);
  await assert.rejects(contracts.saveRateContract({ ...payload, id, items:[item,item] },admin), /UNIQUE/);
  assert.equal((await contracts.getRateContract(id, admin)).items.length, 3);
  sqlite.prepare("UPDATE rate_contracts SET valid_until='2020-01-02'").run();
  assert.equal((await contracts.listRateContracts({status:'Expired'},admin)).length, 1);
  assert.equal((await contracts.listRateContracts({status:'Active'},admin)).length, 0);
});

test('weekly reporting keeps the plan without DPRs and recognises completed work from submitted reports', async () => {
  const rows = [];
  const { WPRService } = load('src/modules/operations/services/WPRService.ts', {
    '../repositories/DPRRepository': { DPRRepository:{ getReports:async () => rows } },
    '../repositories/WPRRepository': { WPRRepository:{ getSchedules:async () => [{
      planned_start:'2026-11-01',planned_end:'2026-11-30',planned_progress_curve:'{"2026-11-14":75}'
    }] } }, '../../core/services/AuthService': {}
  });
  const week = () => WPRService.getWPRAggregation('Site A','2026-11-09','2026-11-15');
  assert.equal((await week()).suggestedPlannedProgress,75);
  for (const [approval_status,progress_pct] of [['Rejected',0],['Draft',0],['Submitted',100]]) {
    rows.push({approval_status, data:{floors:[{workDone:[{schedule_task_id:'task',progress_pct}]}]}});
  }
  const result = await week();
  assert.equal(result.dprsCount,1);
  assert.equal(result.suggestedActualProgress,100);
});

test('approval reports use recorded decision actors and Indian calendar dates once per payment', async t => {
  const { sqlite, db } = fixture(t);
  sqlite.exec(`
    CREATE TABLE approval_history_v2(id INTEGER PRIMARY KEY, entity_id TEXT, entity_type, timestamp, action, performed_by);
    CREATE TABLE payment_requests(pr_id, created_by, created_at, stage, remittance, approved_amount, amount_requested, tds_amount);
    INSERT INTO payment_requests VALUES (1,'maker','2026-11-16','Ready to Remit','',100,100,10),
      (2,'maker','2026-11-16','Ready to Remit','',100,100,10);
    INSERT INTO approval_history_v2 VALUES (1,'1','payment_request','2026-11-18 15:00:00','Approved','finance'),
      (2,'1','payment_request','2026-11-18 20:00:00','Approved','director');`);
  const mocks = { '../db.js':db, '../email.js':{}, './payments.js':{}, './core.js':{getPRStatus:()=>'approved'},
    '../../../src/modules/core/services/AuthService.ts':{AuthService:{requireAuth:()=>{}}} };
  for (const name of ['vendors/services/VendorService','purchase-orders/services/POService','payments/services/PaymentService',
    'payments/repositories/PaymentRepository','core/services/SettingsService','core/services/AuditService']) {
    mocks['../../../src/modules/'+name+'.ts'] = {};
  }
  const reports = load('app/lib/api/reports.js', mocks);
  const audit = await reports.getApprovalAuditReport('2026-11-19','2026-11-19',admin);
  assert.equal(audit.entries.length,1);
  assert.equal(audit.entries[0].performed_by,'director');
  assert.equal(audit.entries[0].timestamp,'2026-11-18T20:00:00.000Z');
  const daily = await reports.getDayWiseApprovalReport('','',admin);
  assert.equal(daily.dates[0].date,'2026-11-19');
  assert.equal(daily.summary.total_count,1);
  const all = await reports.getApprovalAuditReport('','',admin);
  assert.ok(all.entries.some(entry => entry.timestamp === null && entry.performed_by === 'Not recorded'));
});

test('deactivating a client retains its identity and linked records', async t => {
  const { sqlite, db } = fixture(t);
  sqlite.exec("CREATE TABLE clients(id INTEGER PRIMARY KEY, name, status, updated_at); CREATE TABLE projects(client_id REFERENCES clients(id)); INSERT INTO clients VALUES (4,'Example','Active',NULL); INSERT INTO projects VALUES(4);");
  const clients = load('app/lib/api/clients.js', { '../db.js':db,'./core.js':{logAudit:async()=>{}},
    './schema-upgrade.js':{initEnterpriseUpgradeSchemas:async()=>{}} });
  await clients.deleteClient(4,admin);
  assert.equal(sqlite.prepare('SELECT status FROM clients JOIN projects ON projects.client_id=clients.id').get().status,'Inactive');
});
