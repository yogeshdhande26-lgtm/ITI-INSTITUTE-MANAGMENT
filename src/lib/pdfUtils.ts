import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';

interface ExportPDFOptions {
  filename: string;
  format?: 'a4' | 'a3' | 'legal';
  orientation?: 'portrait' | 'landscape';
  margin?: number;
}

/**
 * Standardized high-quality PDF generation using html2pdf.js
 * Supports Marathi/Hindi fonts and handles custom fields/attachments.
 */
export const exportToPDF = async (element: HTMLElement, options: ExportPDFOptions) => {
  if (!element) return;

  toast.info("Preparing PDF document...");

  const opt = {
    margin: options.margin ?? 10,
    filename: options.filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      logging: false, 
      letterRendering: true,
      onclone: (doc: Document) => {
        // High-fidelity color normalization for PDF engine
        // Resolves oklab/oklch errors by forcing standard color space references
        const style = doc.createElement('style');
        style.innerHTML = `
          :root {
            color-scheme: light !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        `;
        doc.head.appendChild(style);

        // Canvas-based color resolver to force RGB conversion
        const canvas = doc.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        
        const resolveColorValue = (value: string) => {
          if (!value || !ctx) return value;
          // Only process if it contains problematic keywords
          const hasOkl = value.includes('okl');
          const hasCanvas = value.includes('canvas');
          if (!hasOkl && !hasCanvas) return value;
          
          // Case 1: The entire value might be a single color keyword or simple function
          // We try to resolve the whole thing first if it's relatively short
          if (value.length < 100 && !value.includes(',') && !value.includes('gradient')) {
             try {
               ctx.fillStyle = value;
               const resolved = ctx.fillStyle;
               if (resolved && !resolved.includes('okl') && !resolved.includes('canvas')) {
                 return resolved;
               }
             } catch (e) { /* ignore */ }
          }

          // Case 2: Complex values (box-shadow, gradients, etc.)
          // Regex to match color functions including potentially one level of nested parens
          const colorRegex = /(oklch|oklab|canvastext|canvas)\((?:[^()]+|\([^()]*\))*\)|(canvastext|canvas)(?![a-z])/g;
          
          return value.replace(colorRegex, (match) => {
            try {
              ctx.fillStyle = match;
              const resolved = ctx.fillStyle;
              // Ensure we don't return the same problematic string if resolution failed
              if (resolved && !resolved.includes('okl') && !resolved.includes('canvas')) {
                return resolved;
              }
              // Fallback to a safe color if it's still okl/canvas (which should not happen if browser resolves it)
              return match.includes('red') ? '#ff0000' : '#000000'; 
            } catch {
              return match;
            }
          });
        };

        // Scan all style tags in the document to replace oklab/oklch strings
        // This is a broad sweep to fix CSS variables and global rules
        const styleTags = doc.getElementsByTagName('style');
        for (let i = 0; i < styleTags.length; i++) {
          try {
            if (styleTags[i].innerHTML.includes('okl')) {
              styleTags[i].innerHTML = resolveColorValue(styleTags[i].innerHTML);
            }
          } catch (e) {
            // Ignore errors
          }
        }

        // Traverse all elements as a second pass for absolute computed styles
        const elements = doc.getElementsByTagName('*');
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i] as HTMLElement;
          const comp = window.getComputedStyle(el);
          
          // Backgrounds and basic colors
          if (comp.color) el.style.color = resolveColorValue(comp.color);
          if (comp.backgroundColor) el.style.backgroundColor = resolveColorValue(comp.backgroundColor);
          if (comp.backgroundImage) el.style.backgroundImage = resolveColorValue(comp.backgroundImage);
          
          // Borders
          if (comp.borderTopColor) el.style.borderTopColor = resolveColorValue(comp.borderTopColor);
          if (comp.borderRightColor) el.style.borderRightColor = resolveColorValue(comp.borderRightColor);
          if (comp.borderBottomColor) el.style.borderBottomColor = resolveColorValue(comp.borderBottomColor);
          if (comp.borderLeftColor) el.style.borderLeftColor = resolveColorValue(comp.borderLeftColor);
          
          // Shadows, filters and Other
          if (comp.boxShadow) el.style.boxShadow = resolveColorValue(comp.boxShadow);
          if (comp.textShadow) el.style.textShadow = resolveColorValue(comp.textShadow);
          if (comp.outlineColor) el.style.outlineColor = resolveColorValue(comp.outlineColor);
          if (comp.filter) el.style.filter = resolveColorValue(comp.filter);
          if (comp.backdropFilter) el.style.backdropFilter = resolveColorValue(comp.backdropFilter);

          // SVG specific
          if (el instanceof SVGElement) {
            if (comp.fill) el.style.fill = resolveColorValue(comp.fill);
            if (comp.stroke) el.style.stroke = resolveColorValue(comp.stroke);
            // Stop color for gradients
            if (el.tagName === 'stop') {
              const stopColor = el.getAttribute('stop-color');
              if (stopColor) el.setAttribute('stop-color', resolveColorValue(stopColor));
            }
          }
        }
      }
    },
    jsPDF: { 
      unit: 'mm', 
      format: options.format ?? 'a4', 
      orientation: options.orientation ?? 'portrait' as const 
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  try {
    await html2pdf().set(opt).from(element).save();
    toast.success('PDF generated successfully!');
  } catch (err) {
    console.error('PDF Generation Error:', err);
    toast.error('Failed to generate PDF. Please try again.');
  }
};
