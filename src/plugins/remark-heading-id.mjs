/**
 * Stable heading anchors.
 *
 *   ## Diversification [#diversification]
 *
 * becomes <h2 id="diversification">Diversification</h2>. Every language version of a lesson
 * uses the same ids, so links and <Ref sec="..."/> keep working after a title changes.
 * scripts/check.py requires an explicit id on every h2 in lesson pages.
 */
const MARKER = /\s*\[#([a-z0-9][a-z0-9-]*)\]\s*$/;

export default function remarkHeadingId() {
	return (tree) => {
		const walk = (node) => {
			if (node.type === 'heading' && Array.isArray(node.children) && node.children.length > 0) {
				const last = node.children[node.children.length - 1];
				if (last.type === 'text') {
					const m = last.value.match(MARKER);
					if (m) {
						last.value = last.value.slice(0, m.index);
						node.data = node.data || {};
						node.data.hProperties = node.data.hProperties || {};
						node.data.hProperties.id = m[1];
					}
				}
			}
			if (Array.isArray(node.children)) node.children.forEach(walk);
		};
		walk(tree);
	};
}
