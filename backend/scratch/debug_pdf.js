const pdfParse = require('pdf-parse');
console.log('Type of PDFParse:', typeof pdfParse.PDFParse);
if (typeof pdfParse.PDFParse === 'function') {
    console.log('PDFParse is a function!');
}
