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
  
  // Update dropdown after storing mission
  updateFireMissionDropdown();
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
  
  // Update dropdown after clearing storage
  updateFireMissionDropdown();
}

function loadFireMissionParameters() {
  var storageSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Storage");
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  if (storageSheet.getLastRow() === 0) {
    SpreadsheetApp.getUi().alert('No stored fire missions found.');
    return;
  }
  
  // Get all missions with their names and positions
  var missions = [];
  var currentRow = 1;
  
  while (currentRow <= storageSheet.getLastRow()) {
    var cellValue = storageSheet.getRange(currentRow, 1).getValue();
    
    // Check if this is a mission header (contains date and mission name)
    if (cellValue && cellValue.toString().includes(' - ')) {
      var missionNameFull = cellValue.toString();
      var missionName = missionNameFull.split(' - ')[1]; // Extract mission name after date
      
      // Find the data for this mission (should be 6 rows starting from currentRow + 2)
      if (currentRow + 2 <= storageSheet.getLastRow()) {
        var missionData = {
          name: missionName,
          startRow: currentRow + 2, // Data starts after header row
          fullHeader: missionNameFull
        };
        missions.push(missionData);
      }
    }
    currentRow++;
  }
  
  if (missions.length === 0) {
    SpreadsheetApp.getUi().alert('No valid fire missions found.');
    return;
  }
  
  // Create a list of mission names for user selection
  var missionNames = missions.map(function(mission) {
    return mission.fullHeader;
  });
  
  // Show selection dialog
  var ui = SpreadsheetApp.getUi();
  var response = ui.showSelectionDialog('Select Fire Mission to Load', 
                                        'Choose a fire mission to load:', 
                                        missionNames);
  
  if (response.getSelectedButton() !== ui.Button.OK) {
    return; // User cancelled
  }
  
  var selectedIndex = missionNames.indexOf(response.getSelectedItem());
  if (selectedIndex === -1) {
    ui.alert('Invalid selection.');
    return;
  }
  
  var selectedMission = missions[selectedIndex];
  
  // Load the mission name to B4
  sheet.getRange("B4").setValue(selectedMission.name);
  
  // Load the second range data (A5:B10) - which corresponds to rows 7-12 in storage
  // The storage structure is: Header, "Fire Solution/Value", then 4 rows from A18:B21, then 6 rows from A5:B10
  var dataStartRow = selectedMission.startRow + 4; // Skip the first 4 rows (A18:B21 data)
  
  if (dataStartRow + 5 <= storageSheet.getLastRow()) {
    var loadData = storageSheet.getRange(dataStartRow, 1, 6, 2).getValues();
    sheet.getRange("A5:B10").setValues(loadData);
    
    ui.alert('Fire mission "' + selectedMission.name + '" loaded successfully.');
    
    // Update dropdown after loading mission
    updateFireMissionDropdown();
  } else {
    ui.alert('Error: Incomplete data for selected mission.');
  }
}

function updateFireMissionDropdown() {
  var storageSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Storage");
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var dropdownCell = sheet.getRange("A13"); // Cell for the dropdown
  
  if (storageSheet.getLastRow() === 0) {
    // Clear dropdown if no missions
    dropdownCell.clearDataValidations();
    dropdownCell.setValue("No missions stored");
    return;
  }
  
  // Get all missions
  var missions = [];
  var currentRow = 1;
  
  while (currentRow <= storageSheet.getLastRow()) {
    var cellValue = storageSheet.getRange(currentRow, 1).getValue();
    
    // Check if this is a mission header (contains date and mission name)
    if (cellValue && cellValue.toString().includes(' - ')) {
      var missionNameFull = cellValue.toString();
      var missionName = missionNameFull.split(' - ')[1]; // Extract mission name after date
      
      if (currentRow + 2 <= storageSheet.getLastRow()) {
        missions.push(missionNameFull);
      }
    }
    currentRow++;
  }
  
  if (missions.length === 0) {
    dropdownCell.clearDataValidations();
    dropdownCell.setValue("No valid missions");
    return;
  }
  
  // Add "Select Mission..." as first option
  var dropdownOptions = ["Select Mission..."].concat(missions);
  
  // Create data validation rule for dropdown
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(dropdownOptions, true)
    .setAllowInvalid(false)
    .setHelpText("Select a fire mission to load")
    .build();
  
  dropdownCell.setDataValidation(rule);
  dropdownCell.setValue("Select Mission...");
}

function loadSelectedFireMission(selectedMission) {
  var storageSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Storage");
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  if (!selectedMission || selectedMission === "Select Mission..." || selectedMission === "No missions stored" || selectedMission === "No valid missions") {
    return;
  }
  
  // Find the mission in storage
  var missions = [];
  var currentRow = 1;
  
  while (currentRow <= storageSheet.getLastRow()) {
    var cellValue = storageSheet.getRange(currentRow, 1).getValue();
    
    if (cellValue && cellValue.toString().includes(' - ')) {
      var missionNameFull = cellValue.toString();
      var missionName = missionNameFull.split(' - ')[1];
      
      if (currentRow + 2 <= storageSheet.getLastRow()) {
        var missionData = {
          name: missionName,
          startRow: currentRow + 2,
          fullHeader: missionNameFull
        };
        missions.push(missionData);
      }
    }
    currentRow++;
  }
  
  // Find the selected mission
  var selectedMissionData = missions.find(function(mission) {
    return mission.fullHeader === selectedMission;
  });
  
  if (!selectedMissionData) {
    SpreadsheetApp.getUi().alert('Mission not found.');
    return;
  }
  
  // Load the mission name to B4
  sheet.getRange("B4").setValue(selectedMissionData.name);
  
  // Load the second range data (A5:B10)
  var dataStartRow = selectedMissionData.startRow + 4; // Skip the first 4 rows (A18:B21 data)
  
  if (dataStartRow + 5 <= storageSheet.getLastRow()) {
    var loadData = storageSheet.getRange(dataStartRow, 1, 6, 2).getValues();
    sheet.getRange("A5:B10").setValues(loadData);
    
    // Reset dropdown to "Select Mission..."
    sheet.getRange("D4").setValue("Select Mission...");
  } else {
    SpreadsheetApp.getUi().alert('Error: Incomplete data for selected mission.');
  }
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Fire Mission')
      .addItem('📋 Store Fire Solution', 'storeFireMissionParameters')
      .addItem('📁 Load Fire Solution', 'loadFireMissionParameters')
      .addSeparator()
      .addItem('🗑️ Clear Fire Solutions', 'clearStorageSheet')
      .addToUi();
  
  // Initialize the dropdown on open
  updateFireMissionDropdown();
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
  
  // Handle dropdown selection in D4
  if (activeCell.getA1Notation() === "A13" && typeof activeValue === 'string') {
    loadSelectedFireMission(activeValue);
    return;
  }
  
  // Test triggers for all functions
  if (activeValue === true) {
    if (activeCell.getA1Notation() === "A11") {
      storeFireMissionParameters();
      activeCell.setValue(false); // Uncheck the checkbox after execution
    }
    
    if (activeCell.getA1Notation() === "A12") {
      clearStorageSheet();
      activeCell.setValue(false); // Uncheck the checkbox after execution
    }
    
    if (activeCell.getA1Notation() === "A13") {
      loadFireMissionParameters();
      activeCell.setValue(false); // Uncheck the checkbox after execution
    }
  }
}