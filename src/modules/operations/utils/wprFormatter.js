/**
 * Formats WPR report data into a neat WhatsApp/Text string.
 */
export function formatWPRToText(wpr) {
  const {
    project = '',
    week_start = '',
    week_end = '',
    planned_progress = 0,
    actual_progress = 0,
    variance = 0,
    summary_text = '',
    render_image_url = '',
    actual_image_url = ''
  } = wpr;

  const varVal = parseFloat(variance) || 0;
  let statusMarker = '✅ On Track';
  if (varVal < -5) {
    statusMarker = '⚠️ Behind';
  } else if (varVal > 5) {
    statusMarker = '🚀 Ahead';
  }

  let out = `**************************************************\n\n`;
  out += `WEEKLY PROGRESS REPORT (WPR)\n\n`;
  out += `Project: ${project}\n`;
  out += `Period: ${week_start} to ${week_end}\n\n`;
  out += `----------------------------------\n\n`;

  out += `PROGRESS METRICS\n\n`;
  out += `• Planned Progress: ${planned_progress}%\n`;
  out += `• Actual Progress:  ${actual_progress}%\n`;
  out += `• Variance:         ${varVal > 0 ? '+' : ''}${varVal}%\n`;
  out += `• Current Status:   ${statusMarker}\n\n`;
  out += `----------------------------------\n\n`;

  if (summary_text) {
    out += `SUMMARY NARRATIVE\n\n`;
    out += `"${summary_text}"\n\n`;
    out += `----------------------------------\n\n`;
  }

  if (render_image_url || actual_image_url) {
    out += `PAIRED MEDIA ATTACHMENTS\n\n`;
    if (render_image_url) out += `• 3D Design Render: ${render_image_url}\n`;
    if (actual_image_url) out += `• Site Photo: ${actual_image_url}\n`;
    out += `\n----------------------------------\n\n`;
  }

  out += `**************************************************`;

  return out;
}
