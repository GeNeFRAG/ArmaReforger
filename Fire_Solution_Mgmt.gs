function storeFireMissionParameters() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Get mission name from cell B4
  var missionName = sheet.getRange("B4").getValue();
  if (!missionName || missionName.toString().trim() === '') {
    return; // Exit if no mission name
  }
  
  var storageSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Storage");
  
  // Clear formatting if sheet is empty
  clearFormattingIfEmpty();
  
  var range = sheet.getRange("A18:B21"); // First range
  var values = range.getValues();
  
  // Add second range for additional values - adjust as needed
  var additionalRange = sheet.getRange("A5:B10"); // Second range
  var additionalValues = additionalRange.getValues();
  
  // Combine both value arrays
  var allValues = values.concat(additionalValues);
  
  // Get the current date
  var date = new Date();
  var formattedDate = Utilities.formatDate(date, Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
  
  // Add empty row before new calculation if there's existing data
  var lastRow = storageSheet.getLastRow();
  console.log("Last row before adding empty row: " + lastRow);
  
  addEmptyRowBetweenMissions(storageSheet);
  
  // Insert the header with the date and mission name at row 1
  if (storageSheet.getLastRow() > 0) {
    storageSheet.insertRowBefore(1);
    storageSheet.getRange(1, 1, 1, 2).setValues([[`${formattedDate} - ${missionName.toString().trim()}`, ""]]);
    var dateHeaderRow = 1;
    
    storageSheet.insertRowBefore(2);
    storageSheet.getRange(2, 1, 1, 2).setValues([["Fire Solution", "Value"]]);
    var headerRow = 2;
    
    // Insert data rows
    for (var i = 0; i < allValues.length; i++) {
      storageSheet.insertRowBefore(3 + i);
      storageSheet.getRange(3 + i, 1, 1, 2).setValues([allValues[i]]);
    }
    
    // Apply formatting only to the new header rows
    var dateHeaderRange = storageSheet.getRange(dateHeaderRow, 1, 1, 2);
    dateHeaderRange.setFontWeight("bold").setHorizontalAlignment("left");
    
    var headerRange = storageSheet.getRange(headerRow, 1, 1, 2);
    headerRange.setFontWeight("bold").setHorizontalAlignment("left");
    
    // Set alignment for data rows (rows 3 to 3+values.length-1)
    if (allValues.length > 0) {
      var dataRange = storageSheet.getRange(3, 1, allValues.length, 2);
      dataRange.setFontWeight("normal").setHorizontalAlignment("left");
      
      // Highlight rows 3, 5, and 6 (which correspond to data rows 0, 2, and 3)
      if (allValues.length > 0) storageSheet.getRange(3, 1, 1, 2).setBackground("#FFE599"); // Row 3
      if (allValues.length > 2) storageSheet.getRange(5, 1, 1, 2).setBackground("#FFE599"); // Row 5
      if (allValues.length > 3) storageSheet.getRange(6, 1, 1, 2).setBackground("#FFE599"); // Row 6
      
      // Apply number formatting to rows 3, 4, 5 (column B) if they contain numbers
      if (allValues.length > 0 && typeof allValues[0][1] === 'number' && !isNaN(allValues[0][1])) {
        storageSheet.getRange(3, 2).setNumberFormat("#,##0_);(#,##0)"); // Row 3
      }
      if (allValues.length > 1 && typeof allValues[1][1] === 'number' && !isNaN(allValues[1][1])) {
        storageSheet.getRange(4, 2).setNumberFormat("#,##0_);(#,##0)"); // Row 4
      }
      if (allValues.length > 2 && typeof allValues[2][1] === 'number' && !isNaN(allValues[2][1])) {
        storageSheet.getRange(5, 2).setNumberFormat("#,##0_);(#,##0)"); // Row 5
      }
    }
  } else {
    // First mission - use appendRow
    storageSheet.appendRow([`${formattedDate} - ${missionName.toString().trim()}`, ""]);
    var dateHeaderRow = storageSheet.getLastRow();
    
    storageSheet.appendRow(["Fire Solution", "Value"]);
    var headerRow = storageSheet.getLastRow();
    
    for (var i = 0; i < allValues.length; i++) {
      storageSheet.appendRow(allValues[i]);
    }
    
    // Apply formatting - only make the two header rows bold
    var dateHeaderRange = storageSheet.getRange(dateHeaderRow, 1, 1, 2);
    dateHeaderRange.setFontWeight("bold").setHorizontalAlignment("left");
    
    var headerRange = storageSheet.getRange(headerRow, 1, 1, 2);
    headerRange.setFontWeight("bold").setHorizontalAlignment("left");
    
    // Set alignment for all data rows (no bold formatting for parameter values)
    var dataStartRow = headerRow + 1;
    var dataEndRow = storageSheet.getLastRow();
    var dataRange = storageSheet.getRange(dataStartRow, 1, dataEndRow - dataStartRow + 1, 2);
    dataRange.setHorizontalAlignment("left");
    
    // Highlight rows 3, 5, and 6 relative to the data start
    if (allValues.length > 0) storageSheet.getRange(dataStartRow, 1, 1, 2).setBackground("#FFE599"); // First data row
    if (allValues.length > 2) storageSheet.getRange(dataStartRow + 2, 1, 1, 2).setBackground("#FFE599"); // Third data row
    if (allValues.length > 3) storageSheet.getRange(dataStartRow + 3, 1, 1, 2).setBackground("#FFE599"); // Fourth data row
    
    // Apply number formatting to rows 3, 4, 5 relative to data start (column B) if they contain numbers
    if (allValues.length > 0 && typeof allValues[0][1] === 'number' && !isNaN(allValues[0][1])) {
      storageSheet.getRange(dataStartRow, 2).setNumberFormat("#,##0_);(#,##0)"); // First data row
    }
    if (allValues.length > 1 && typeof allValues[1][1] === 'number' && !isNaN(allValues[1][1])) {
      storageSheet.getRange(dataStartRow + 1, 2).setNumberFormat("#,##0_);(#,##0)"); // Second data row
    }
    if (allValues.length > 2 && typeof allValues[2][1] === 'number' && !isNaN(allValues[2][1])) {
      storageSheet.getRange(dataStartRow + 2, 2).setNumberFormat("#,##0_);(#,##0)"); // Third data row
    }
  }
}

function clearFormattingIfEmpty() {
  var storageSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Storage");
  
  // Check if the sheet is empty
  if (storageSheet.getLastRow() === 0) {
    // Clear all formatting from the entire sheet
    storageSheet.clear({formatOnly: true});
  }
}

function addEmptyRowBetweenMissions(storageSheet) {
  if (storageSheet.getLastRow() > 0) {
    storageSheet.insertRowBefore(1);
  }
}

function clearStorageSheet() {
  var storageSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Storage");
  storageSheet.clear();
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Fire Mission')
      .addItem('📋 Store Fire Solution', 'storeFireMissionParameters')
      .addSeparator()
      .addItem('🗑️ Clear Fire Solutions', 'clearStorageSheet')
      .addToUi();
}

function counter() {
  var counterSS = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var counterCell = counterSS.getRange("D1");
  var currentValue = counterCell.getValue();
  counterCell.setValue(currentValue + 1);
}

function onEdit(e) {
  var activeCell = e.range;
  var sheetName = activeCell.getSheet().getName();
  var activeValue = activeCell.getValue();
  
  // Test triggers for all functions
  if (activeValue === true) {
    // if (activeCell.getA1Notation() === "A11") {
    //   counter();
    //   activeCell.setValue(false); // Uncheck the checkbox after execution
    // }
    
    // if (activeCell.getA1Notation() === "A12") {
    //   counter();
    //   activeCell.setValue(false); // Uncheck the checkbox after execution
    // }
    
    if (activeCell.getA1Notation() === "A11") {
      storeFireMissionParameters();
      activeCell.setValue(false); // Uncheck the checkbox after execution
    }
    
    if (activeCell.getA1Notation() === "A12") {
      clearStorageSheet();
      activeCell.setValue(false); // Uncheck the checkbox after execution
    }
  }
}