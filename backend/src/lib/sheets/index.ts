/**
 * Google Sheets API integration
 * Handles authentication and formula extraction from Google Sheets
 */

import { google } from 'googleapis';

/**
 * Create an authenticated Sheets API client
 */
export function createSheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Get formulas from a spreadsheet range
 */
export async function getFormulasFromRange(
  accessToken: string,
  spreadsheetId: string,
  range: string
) {
  const sheets = createSheetsClient(accessToken);

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values || [];
    const formulas: Array<{ cell: string; formula: string; value: unknown }> = [];

    // Also get the formulas (A1 notation with =)
    const formulasResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: 'FORMULA',
    });

    const formulaValues = formulasResponse.data.values || [];

    formulaValues.forEach((row, rowIndex) => {
      row.forEach((cell: string, colIndex: number) => {
        if (cell && cell.startsWith('=')) {
          const rowLetter = String.fromCharCode(65 + colIndex);
          const cellAddress = `${rowLetter}${rowIndex + 1}`;
          formulas.push({
            cell: cellAddress,
            formula: cell,
            value: values[rowIndex]?.[colIndex],
          });
        }
      });
    });

    return formulas;
  } catch (error) {
    console.error('Error getting formulas from Sheets:', error);
    throw error;
  }
}

/**
 * Update a cell in a spreadsheet
 */
export async function updateCell(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  value: string
) {
  const sheets = createSheetsClient(accessToken);

  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[value]],
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error updating cell:', error);
    throw error;
  }
}

/**
 * Get spreadsheet metadata
 */
export async function getSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
) {
  const sheets = createSheetsClient(accessToken);

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    return {
      title: response.data.properties?.title,
      sheets: response.data.sheets?.map((sheet) => ({
        id: sheet.properties?.sheetId,
        title: sheet.properties?.title,
        rowCount: sheet.properties?.gridProperties?.rowCount,
        columnCount: sheet.properties?.gridProperties?.columnCount,
      })),
    };
  } catch (error) {
    console.error('Error getting spreadsheet metadata:', error);
    throw error;
  }
}
