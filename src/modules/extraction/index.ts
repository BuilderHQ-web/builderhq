/**
 * extraction · public surface.
 *
 * PDF → structured suggestions, powered by Claude. Server-only.
 */

export { isExtractionEnabled, EXTRACTION_MODEL } from "./client";
export {
  extractTenderFromPdf,
  type TenderExtraction,
  type TenderExtractionResult,
  type ExtractedCostLine,
} from "./tender";
export {
  extractProjectFromPdf,
  type ProjectExtraction,
  type ProjectExtractionResult,
} from "./project";
