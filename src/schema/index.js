/**
 * Schema management and interaction functions
 */

import customers from './customers.json';
import invoice from './invoice.json';
import workorder from './workorder.json';
import worksheet from './worksheet.json';

import { performFMScript } from '../utils/filemaker';

/**
 * Provides a natural language description of the database schema and relationships
 * @returns {string} A detailed description of the database's purpose and structure
 */
export function getSchemaSummary() {
  return `This database manages a cleaning service business system with the following structure:

Organization Level:
- REST_Organization serves as the root entity, representing cleaning service companies
- Each organization manages its own customers, worksheets, work orders, and invoices
- Organizations can track GST/PST rates, business details, and integration settings (e.g., QuickBooks)

Customer Management:
- REST_Customers stores client information including personal/business details and QuickBooks integration
- Customers have associated contact information (emails, phones, addresses)
- Customer relationships can be tracked through REST_Related
- Customers can have payroll settings and process records

Service Management:
- REST_Worksheet represents service agreements with customer
  * Represnts ongoing customer contract based cleaning services
  * Tracks cleaner assignments, rates, and scheduling
  * Contains detailed service specifications and pricing
  * Can be suspended or have relief cleaners assigned

- REST_WorkOrders handles specific cleaning jobs
  * Represnts specific (one off) cleaning services
  * Can be generated from worksheets to represnt monthly, quarterly, or annual services
  * Tracks cleaner assignments, completion status, and pricing
  * Includes detailed task records and pricing
  * Tracks cleaner assignments and completion status

Financial Management:
- REST_Invoice handles billing records
  * Links to customers and cleaners
  * Tracks amounts, GST, and payment status
- REST_Invoice Records stores detailed transaction records
  * Records payments to cleaners and providers
  * Integrates with QuickBooks through REST_invoiceRecordsJOINqbLines

Key Relationships:
1. Organizations (parent) → Customers (child)
2. Customers → Worksheets
2. Customers → Work Orders
3. Customers → Invoices → Invoice Records
4. All entities maintain audit trails (creation/modification dates, user tracking)`;
}

/**
 * Fetch the customers schema
 * @returns {Object} The customers schema definition
 */
export function getCustomersSchema() {
  return customers;
}

/**
 * Fetch the invoice schema
 * @returns {Object} The invoice schema definition
 */
export function getInvoiceSchema() {
  return invoice;
}

/**
 * Fetch the work order schema
 * @returns {Object} The work order schema definition
 */
export function getWorkOrderSchema() {
  return workorder;
}

/**
 * Fetch the worksheet schema
 * @returns {Object} The worksheet schema definition
 */
export function getWorksheetSchema() {
  return worksheet;
}

/**
 * Retrieve saved SQL search functions from FileMaker
 * @param {string} searchName The name of the saved search
 * @returns {Promise<Object>} The saved search function configuration
 * @throws {Error} If the FileMaker script execution fails or returns invalid JSON
 */
export async function getSavedSQLSearch(searchName,searchTerm) {
    let searchTable;
    switch(searchName) {
        case "Customers":
            searchTable = "REST_Customers";
            break;
        case "Invoices":
            searchTable = "REST_Invoice";
            break;
        case "Work Orders":
            searchTable = "REST_WorkOrders";
            break;
        case "Worksheets":
            searchTable = "REST_Worksheet";
            break;
        default:
            searchTable = "REST_Customers";
    }
    const params = {
        action: "performScript",
        parameter: {
            script: "Get Saved SQL Search",
            scriptParam: {
                table: searchTable,
                search: searchTerm
            }
        }
    }
  const result = await performFMScript(params);
  return JSON.parse(result);
}

/**
 * Retrieve saved dapiSearch functions from FileMaker
 * @param {string} searchName The name of the saved search
 * @returns {Promise<Object>} The saved search function configuration
 * @throws {Error} If the FileMaker script execution fails or returns invalid JSON
 */
export async function getSavedDapiSearch(searchName, searchTerm) {
  let searchTable;
  switch(searchName) {
    case "Customers":
      searchTable = "REST_Customers";
      break;
    case "Invoices":
      searchTable = "REST_Invoice";
      break;
    case "Work Orders":
      searchTable = "REST_WorkOrders";
      break;
    case "Worksheets":
      searchTable = "REST_Worksheet";
      break;
    default:
      searchTable = "REST_Customers";
  }
  const params = {
    action: "performScript",
    parameter: {
      script: "Get Saved DAPI Search",
      scriptParam: {
        table: searchTable,
        search: searchTerm
      }
    }
  }
  const result = await performFMScript(params);
  return JSON.parse(result);
}

/**
 * Retrieve saved HTML display code from FileMaker
 * @param {string} displayName The name of the saved display
 * @returns {Promise<Object>} The HTML display configuration
 * @throws {Error} If the FileMaker script execution fails or returns invalid JSON
 */
export async function getSavedHTMLDisplay(displayName, displayTerm) {
  let displayTable;
  switch(displayName) {
    case "Customers":
      displayTable = "REST_Customers";
      break;
    case "Invoices":
      displayTable = "REST_Invoice";
      break;
    case "Work Orders":
      displayTable = "REST_WorkOrders";
      break;
    case "Worksheets":
      displayTable = "REST_Worksheet";
      break;
    default:
      displayTable = "REST_Customers";
  }
  const params = {
    action: "performScript",
    parameter: {
      script: "Get Saved HTML Display",
      scriptParam: {
        table: displayTable,
        display: displayTerm
      }
    }
  }
  const result = await performFMScript(params);
  return JSON.parse(result);
}