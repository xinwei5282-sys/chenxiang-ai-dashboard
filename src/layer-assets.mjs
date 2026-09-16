// Measured source rectangles in the customer's 1671 × 941 reference.
// Trace PNGs preserve reference subjects and visible luminous circles; only caption-obscured lower arcs are repaired.
export const iconRegions={
 nursery:{file:'trace-nursery',w:120,h:120,kind:'trace'},base:{file:'trace-base',w:120,h:120,kind:'trace'},raw:{file:'trace-raw',w:120,h:120,kind:'trace'},factory:{file:'trace-factory',w:120,h:120,kind:'trace'},product:{file:'trace-product',w:120,h:120,kind:'trace'},transport:{file:'trace-transport',w:120,h:120,kind:'trace'},knowledge:{file:'ai-knowledge',w:71,h:62,kind:'capability'},traceability:{file:'ai-traceability',w:71,h:62,kind:'capability'},analysis:{file:'ai-analysis',w:71,h:62,kind:'capability'},warning:{file:'ai-warning',w:71,h:62,kind:'capability'}
};
export const layerIcon=id=>{const r=iconRegions[id];return `<img class="source-icon source-icon-${r.kind}" data-layer="3" data-icon="${id}" src="./assets/extracted/icons/${r.file}.png" width="${r.w}" height="${r.h}" alt="" aria-hidden="true">`};
