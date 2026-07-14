import { calculateOverallManpower } from './dprCalculations.js';

/**
 * Formats a DPR data object into a neat WhatsApp/Text string
 * according to the exact client-ready output specification.
 */
export function formatDPRToText(dpr) {
  const { 
    date = '', 
    project = '', 
    client = '',
    weather = '',
    shift = '',
    status = '',
    remarks = '',
    data = {} 
  } = dpr;

  const floors = data.floors || [];
  const materials = data.materials || [];
  const issues = data.issues || [];
  const visitors = data.visitors || [];
  
  // Header
  const seqIdLine = data.seqId ? `ID: ${data.seqId}\n` : '';
  let out = `**************************************************\n\n`;
  out += `DPR\n${seqIdLine}\n`;
  out += `Date: ${date}\n\n`;
  out += `Project: ${project}\n\n`;
  if (client) out += `Client: ${client}\n\n`;

  // Important metadata
  const statusFlag = (status === 'Delayed' || status === 'Critical') ? ' ⚠️' : '';
  if (status) out += `Status: ${status}${statusFlag}\n\n`;
  if (weather) out += `Weather: ${weather}\n\n`;
  if (shift) out += `Shift: ${shift}\n\n`;
  if (remarks) out += `Remarks: ${remarks}\n\n`;

  out += `----------------------------------\n\n`;

  // --- Section: Floor-wise Manpower ---
  floors.forEach(floor => {
    out += `${floor.name}\n\n`;
    out += `Manpower Details\n\n`;
    
    const manpower = floor.manpower || [];
    manpower.forEach(mp => {
      const count = parseInt(mp.count) || 0;
      const displayCount = count < 10 ? `0${count}` : `${count}`;
      out += `${mp.team} :- ${displayCount}\n\n`;
    });
    
    out += `----------------------------------\n\n`;
  });

  // Overall Total
  const overallManpower = calculateOverallManpower(data);
  out += `TOTAL MANPOWER :- ${overallManpower}\n\n`;
  out += `----------------------------------\n\n`;

  // --- Section: Work Done Today ---
  out += `WORK DONE TODAY\n\n`;
  
  floors.forEach(floor => {
    const work = floor.workDone || [];
    if (work.length > 0) {
      out += `${floor.name}\n\n`;
      work.forEach(w => {
        if (w.task) {
          const progressTxt = w.progress ? ` [${w.progress}%]` : '';
          out += `• ${w.task}${progressTxt}\n\n`;
        }
      });
      out += `----------------------------------\n\n`;
    }
  });

  // --- Section: Tomorrow's Plan ---
  let hasTomorrowPlan = false;
  let planOut = `TOMORROW'S PLAN\n\n`;
  floors.forEach(floor => {
    const plans = floor.tomorrowPlan || [];
    if (plans.length > 0) {
      hasTomorrowPlan = true;
      planOut += `${floor.name}\n\n`;
      plans.forEach(p => {
        if (p.task) {
          planOut += `• ${p.task}\n\n`;
        }
      });
      planOut += `----------------------------------\n\n`;
    }
  });
  if (hasTomorrowPlan) out += planOut;

  // --- Section: Site Issues ---
  if (issues.length > 0) {
    out += `SITE ISSUES\n\n`;
    issues.forEach(issue => {
      out += `• ${issue.description || issue.issue}\n\n`;
    });
    out += `----------------------------------\n\n`;
  }

  // --- Section: Materials Received/Used ---
  if (materials.length > 0) {
    out += `MATERIALS RECEIVED / USED\n\n`;
    materials.forEach(mat => {
      const type = mat.type ? `[${mat.type}] ` : '';
      out += `• ${type}${mat.item} - ${mat.quantity || ''} ${mat.unit || ''}\n\n`;
    });
    out += `----------------------------------\n\n`;
  }

  // --- Section: Visitors ---
  if (visitors.length > 0) {
    out += `VISITORS\n\n`;
    visitors.forEach(visitor => {
      const purpose = visitor.purpose ? ` (${visitor.purpose})` : '';
      out += `• ${visitor.name || visitor.visitor}${purpose}\n\n`;
    });
    out += `----------------------------------\n\n`;
  }

  out += `**************************************************`;

  return out;
}
