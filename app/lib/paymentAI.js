// Pure JavaScript "Toy" AI Model (No external dependencies)
// To avoid node-gyp build errors on Windows, we implement a simple perceptron-style scoring heuristic.

/**
 * Evaluates a payment request and returns an AI Priority Score (0-100)
 */
export function getPaymentPriorityScore(payment) {
  try {
    const rawAmount = Number(payment.amount_requested || payment.gross_amount || 0);
    
    // Normalize amount assuming typical high-end payments are around 1,000,000
    const amountNormalized = Math.min(rawAmount / 1000000, 1.0);
    const hasRemarks = payment.remarks && payment.remarks.trim().length > 0 ? 1 : 0;
    
    // Simple custom scoring logic simulating AI weights
    // Lower amounts get higher priority. Remarks boost priority.
    let baseScore = 0.8 - (amountNormalized * 0.7); 
    
    if (hasRemarks === 1) {
      baseScore += 0.15; // Boost for complete data
    } else {
      baseScore -= 0.10; // Penalty for missing remarks
    }
    
    // Ensure bounds between 0 and 1
    baseScore = Math.max(0, Math.min(1, baseScore));
    
    return Math.round(baseScore * 100);
  } catch (err) {
    console.error("AI Evaluation failed", err);
    return null; 
  }
}
