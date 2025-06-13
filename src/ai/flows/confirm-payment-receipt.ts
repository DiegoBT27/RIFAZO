'use server';

/**
 * @fileOverview Payment receipt confirmation flow using AI.
 *
 * - confirmPaymentReceipt - A function that confirms payment receipts.
 * - ConfirmPaymentReceiptInput - The input type for the confirmPaymentReceipt function.
 * - ConfirmPaymentReceiptOutput - The return type for the confirmPaymentReceipt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConfirmPaymentReceiptInputSchema = z.object({
  receiptDataUri: z
    .string()
    .describe(
      "A photo of a payment receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  expectedAmount: z.number().describe('The expected payment amount.'),
  payerName: z.string().describe('The name of the payer.'),
  raffleName: z.string().describe('The name of the raffle the payment is for.'),
});

export type ConfirmPaymentReceiptInput = z.infer<typeof ConfirmPaymentReceiptInputSchema>;

const ConfirmPaymentReceiptOutputSchema = z.object({
  isConfirmed: z.boolean().describe('Whether the payment receipt is confirmed or not.'),
  confirmationDetails: z.string().describe('Details of the confirmation, including any discrepancies.'),
});

export type ConfirmPaymentReceiptOutput = z.infer<typeof ConfirmPaymentReceiptOutputSchema>;

export async function confirmPaymentReceipt(input: ConfirmPaymentReceiptInput): Promise<ConfirmPaymentReceiptOutput> {
  return confirmPaymentReceiptFlow(input);
}

const confirmPaymentReceiptPrompt = ai.definePrompt({
  name: 'confirmPaymentReceiptPrompt',
  input: {schema: ConfirmPaymentReceiptInputSchema},
  output: {schema: ConfirmPaymentReceiptOutputSchema},
  prompt: `You are an expert payment verification assistant.

You will analyze the provided payment receipt image to confirm if the payment is valid.

Consider the expected amount, payer name, and raffle name to verify the payment.

Provide clear confirmation details, including any discrepancies found.

Receipt Image: {{media url=receiptDataUri}}
Expected Amount: {{{expectedAmount}}}
Payer Name: {{{payerName}}}
Raffle Name: {{{raffleName}}}`,
});

const confirmPaymentReceiptFlow = ai.defineFlow(
  {
    name: 'confirmPaymentReceiptFlow',
    inputSchema: ConfirmPaymentReceiptInputSchema,
    outputSchema: ConfirmPaymentReceiptOutputSchema,
  },
  async input => {
    const {output} = await confirmPaymentReceiptPrompt(input);
    return output!;
  }
);
