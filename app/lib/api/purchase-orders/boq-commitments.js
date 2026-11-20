import { queryGet, queryRun, queryAll } from '../../db.js';

// Older procurement imports saved BOQ IDs only on po_items. Count these lines
// until an edit creates ledger entries. Explicitly cancelled links stay cancelled.
export const legacyBoqLines = `SELECT p.po_no, p.boq_item_id, SUM(p.qty) AS qty
  FROM po_items p WHERE p.boq_item_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM boq_po_links l WHERE l.po_no = p.po_no AND l.boq_item_id = p.boq_item_id)
  GROUP BY p.po_no, p.boq_item_id`;

export async function releaseBoqCommitments(poNo, includeManual = false) {
  const exists = await queryGet("SELECT name FROM sqlite_master WHERE type='table' AND name='boq_po_links'");
  if (!exists) return;
  const links = await queryAll(`SELECT id, boq_item_id, linked_qty FROM boq_po_links
    WHERE po_no = ? AND status = 'active' AND (? OR link_type != 'manual_link')`, [poNo, Number(includeManual)]);
  for (const link of links) {
    await queryRun('UPDATE boq_items SET committed_qty = MAX(0, committed_qty - ?) WHERE id = ?', [link.linked_qty, link.boq_item_id]);
    await queryRun("UPDATE boq_po_links SET status = 'cancelled' WHERE id = ?", [link.id]);
  }
}

export async function reserveBoqItems(poNo, project, items, email, linkType = 'work_package', editingPo = '') {
  for (const item of items.filter(line => line.boq_item_id)) {
    const source = await queryGet(`SELECT i.description, i.boq_version_id, v.boq_id, h.project
      FROM boq_items i JOIN boq_versions v ON v.id = i.boq_version_id JOIN boq_headers h ON h.id = v.boq_id
      WHERE i.id = ?`, [item.boq_item_id]);
    if (!source || source.project.trim().toLowerCase() !== String(project).trim().toLowerCase()
      || (item.boq_version_id && item.boq_version_id !== source.boq_version_id)) {
      throw new Error('BOQ item does not belong to the selected project and revision.');
    }
    const qty = Number(item.qty ?? item.quantity);
    const rate = Number(item.rate);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(rate) || rate < 0) throw new Error('Invalid BOQ order quantity or rate.');
    const result = await queryRun(`UPDATE boq_items SET committed_qty = COALESCE(committed_qty, 0) + ?
      WHERE id = ? AND ROUND(quantity - COALESCE(committed_qty, 0)
        - COALESCE((SELECT SUM(qty) FROM (${legacyBoqLines}) legacy WHERE legacy.boq_item_id=boq_items.id AND legacy.po_no != ?),0) - ?, 8) >= 0`, [qty, item.boq_item_id, editingPo, qty]);
    if (result.rowsAffected !== 1) throw new Error(`Order exceeds the remaining BOQ quantity for ${source.description}.`);
    await queryRun(`INSERT INTO boq_po_links
      (id, boq_id, boq_version_id, boq_item_id, po_no, linked_qty, po_rate, po_amount, link_type, status, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [crypto.randomUUID(), source.boq_id, source.boq_version_id, item.boq_item_id, poNo, qty, rate,
        Math.round(qty * rate * 100) / 100, linkType, email, new Date().toISOString()]);
    item.boq_id = source.boq_id;
    item.boq_version_id = source.boq_version_id;
  }
}
