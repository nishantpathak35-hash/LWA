// Global navigation must never consume text entry or dialog interactions.
export function shouldIgnoreNavigationShortcut(event) {
  if (event.defaultPrevented || event.isComposing) return true;
  const target = event.composedPath?.()[0] || event.target;
  for (let element = target; element; element = element.parentElement) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) return true;
    if (element.isContentEditable) return true;
    if (['dialog', 'alertdialog', 'textbox', 'combobox'].includes(element.getAttribute?.('role'))) return true;
  }
  return false;
}
