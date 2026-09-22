/**
 * Runs before paint so the first frame already has the right theme.
 * Reads the persisted store (or falls back to system) and sets data-theme.
 */
export function ThemeScript() {
  const code = `(function(){try{var s=JSON.parse(localStorage.getItem("valence.state.v1")||"{}");var t=s.theme;if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
