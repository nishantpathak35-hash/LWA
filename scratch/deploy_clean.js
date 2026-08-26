const fs = require('fs');
const dir = 'C:/Users/Admin/Desktop/Construct-O-Genie/components/marketing';

// 1. Copy updated scratch components
const scratchFiles = [
  'ArchitecturalCanvas.js',
  'Hero.js',
  'ConstructOGenieApp.js',
  'FinalCTA.js',
  'QualitativeOutcomes.js'
];

scratchFiles.forEach(f => {
  const src = 'c:/Users/Admin/Desktop/Final/scratch/' + f;
  const dest = dir + '/' + f;
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('Deployed updated ' + f);
  }
});

// 2. Update section files to make outer <section> backgrounds transparent
const sectionFiles = [
  'ProblemSection.js',
  'ProjectLifecycle.js',
  'BOQSpine.js',
  'CommandCentre.js',
  'RoleTabs.js',
  'SiteOfficeSync.js',
  'FinanceFlow.js',
  'ApprovalStack.js',
  'PortalsSection.js',
  'IndiaNativeOps.js',
  'AuditTraceability.js',
  'QualitativeOutcomes.js',
  'Footer.js'
];

sectionFiles.forEach(f => {
  const p = dir + '/' + f;
  if (fs.existsSync(p)) {
    let code = fs.readFileSync(p, 'utf8');
    // Replace section outer background
    code = code.replace(/<section\s+([^>]*?)className=(["'])([^"']*?)(["'])/g, (match, attrs, q1, cls, q2) => {
      let newCls = cls
        .replace(/bg-\[[^\]]+\](\/\d+)?/g, '')
        .replace(/bg-black(\/\d+)?/g, '')
        .replace(/backdrop-blur-[a-z0-9]+/g, '')
        .trim();
      newCls = 'bg-transparent ' + newCls;
      return `<section ${attrs}className=${q1}${newCls}${q2}`;
    });
    fs.writeFileSync(p, code, 'utf8');
    console.log('Made section transparent in: ' + f);
  }
});

console.log('All updates deployed successfully!');
