jQuery(document).ready(function($) {
    'use strict';
    
    // Add error handling wrapper
    function safeExecute(fn, context) {
        try {
            return fn.call(context);
        } catch (error) {
            if (window.wpm_ajax && window.wpm_ajax.debug) {
                console.error('WPM Error in function:', fn.name || 'anonymous', error);
            }
            return false;
        }
    }
    
    const WorkPlanManager = {
        currentWorkplanId: 0,
        currentGoalId: 0,
        
        init: function() {
            this.bindEvents();
            this.initializeComponents();
        },
        
        bindEvents: function() {
            // Workplan events
            $('#new-workplan').on('click', this.showNewWorkplanForm);
            $('#load-workplan').on('click', this.loadExistingWorkplan);
            $('#save-workplan').on('click', this.saveWorkplan);
            
            // Goal events
            $(document).on('click', '#add-goal', this.addNewGoal);
            $(document).on('click', '.save-goal', this.saveGoal);
            $(document).on('click', '.delete-goal', this.deleteGoal);
            $(document).on('click', '.duplicate-goal', this.duplicateGoal);
            
            // Objective events
            $(document).on('click', '.add-objective', this.addNewObjective);
            $(document).on('click', '.save-objective', this.saveObjective);
            $(document).on('click', '.delete-objective', this.deleteObjective);
            $(document).on('click', '.duplicate-objective', this.duplicateObjective);
            
            // Output events
            $(document).on('click', '.add-output', this.addNewOutput);
            $(document).on('click', '.remove-output', this.removeOutput);
            
            // Export events
            $('#export-excel').on('click', function() { WorkPlanManager.exportWorkplan('excel'); });
            $('#export-csv').on('click', function() { WorkPlanManager.exportWorkplan('csv'); });
            
            // Ordering events - trigger re-ordering when changed
            $(document).on('change', '.goal-letter-select', this.handleGoalReorder);
            $(document).on('change', '.objective-number-input', this.handleObjectiveReorder);
            $(document).on('change', '.output-letter', this.handleOutputReorder);
            
            // Auto-save functionality
            $(document).on('blur', 'input, textarea, select', this.handleAutoSave);
        },
        
        initializeComponents: function() {
            // Hide objectives section on load
            $('#objectives-section').hide();
        },
        
        showLoading: function() {
            $('#wpm-loading').show();
        },
        
        hideLoading: function() {
            $('#wpm-loading').hide();
        },
        
        showNewWorkplanForm: function() {
            $('#workplan-form').show();
            $('#goals-section').hide();
            $('#preview-section').hide();
            
            // Reset form
            $('#workplan-id').val('0');
            $('#workplan-title').val('');
            $('#grant-year').val('');
            $('#workplan-group').val('');
            $('#internal-status').val('Draft');
            
            // Set current date
            const today = new Date();
            $('#workplan-date').val(today.toISOString().split('T')[0]);
            
            WorkPlanManager.currentWorkplanId = 0;
        },
        
        loadExistingWorkplan: function() {
            const workplanId = $('#existing-workplan').val();
            if (!workplanId) {
                alert('Please select a work plan to load.');
                return;
            }
            
            WorkPlanManager.showLoading();
            
            $.ajax({
                url: wpm_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'get_workplan_data',
                    workplan_id: workplanId,
                    nonce: wpm_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        WorkPlanManager.populateWorkplanForm(response.data);
                        WorkPlanManager.currentWorkplanId = workplanId;
                    } else {
                        alert('Failed to load work plan: ' + response.data);
                    }
                    WorkPlanManager.hideLoading();
                },
                error: function() {
                    alert('An error occurred while loading the work plan.');
                    WorkPlanManager.hideLoading();
                }
            });
        },
        
        populateWorkplanForm: function(data) {
            $('#workplan-form').show();
            $('#workplan-id').val(data.id);
            
            // Remove year suffix if present to avoid duplicate years
            let title = data.title;
            title = title.replace(/\s*-\s*\d{4}$/, '');
            $('#workplan-title').val(title);
            
            // Set Internal Status
            $('#internal-status').val(data.internal_status || 'Draft');
            
            // Set Group taxonomy
            if (data.group && data.group.length > 0) {
                const groupName = data.group[0];
                $('#workplan-group option').each(function() {
                    if ($(this).text().trim() === groupName.trim()) {
                        $(this).prop('selected', true);
                        return false;
                    }
                });
            }
            
            // Set Grant Year taxonomy
            if (data.grant_year && data.grant_year.length > 0) {
                const yearName = data.grant_year[0];
                $('#grant-year option').each(function() {
                    if ($(this).text().trim() === yearName.trim()) {
                        $(this).prop('selected', true);
                        return false;
                    }
                });
            }
            
            // Show goals section and populate goals
            $('#goals-section').show();
            WorkPlanManager.populateGoals(data.goals);
            
            // Show preview section
            $('#preview-section').show();
            WorkPlanManager.updatePreview();
        },
        
        saveWorkplan: function() {
            let title = $('#workplan-title').val().trim();
            if (!title) {
                alert('Please enter a work plan title.');
                return;
            }
            
            // Remove any existing year suffix to avoid duplicates
            title = title.replace(/\s*-\s*\d{4}$/, '');
            
            // Get the year from the publish date
            const publishDate = $('#workplan-date').val();
            const year = publishDate ? new Date(publishDate).getFullYear() : new Date().getFullYear();
            
            // Append the year
            const titleWithYear = title + ' - ' + year;
            
            WorkPlanManager.showLoading();
            
            $.ajax({
                url: wpm_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'save_workplan',
                    workplan_id: $('#workplan-id').val(),
                    title: titleWithYear,
                    grant_year: $('#grant-year').val(),
                    group: $('#workplan-group').val(),
                    internal_status: $('#internal-status').val(),
                    nonce: wpm_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        WorkPlanManager.currentWorkplanId = response.data.workplan_id;
                        $('#workplan-id').val(response.data.workplan_id);
                        $('#workplan-title').val(title); // Keep clean title in form
                        $('#goals-section').show();
                        $('#preview-section').show();
                        WorkPlanManager.updatePreview();
                        alert('Work plan saved successfully!');
                    } else {
                        alert('Failed to save work plan: ' + response.data);
                    }
                    WorkPlanManager.hideLoading();
                },
                error: function() {
                    alert('An error occurred while saving the work plan.');
                    WorkPlanManager.hideLoading();
                }
            });
        },
        
        addNewGoal: function() {
            const goalLetter = WorkPlanManager.getNextAvailableGoalLetter();
            
            const goalHtml = WorkPlanManager.getGoalTemplate({
                goal_id: '0',
                goal_title: '',
                goal_letter: goalLetter,
                goal_description: ''
            });
            
            $('#goals-container').append(goalHtml);
            
            // Set the goal letter in the select
            const $newGoal = $('.wpm-goal-item').last();
            $newGoal.find('.goal-letter-select').val(goalLetter);
        },
        
        saveGoal: function() {
            const $goalItem = $(this).closest('.wpm-goal-item');
            const goalData = WorkPlanManager.getGoalFormData($goalItem);
            
            if (!goalData.title.trim()) {
                alert('Please enter a goal title.');
                return;
            }
            
            // Validate for duplicate letter
            if (!WorkPlanManager.isGoalLetterUnique(goalData.letter, goalData.id)) {
                alert('Goal letter "' + goalData.letter + '" is already in use. Please select a different letter.');
                return;
            }
            
            WorkPlanManager.showLoading();
            
            $.ajax({
                url: wpm_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'save_goal',
                    goal_id: goalData.id,
                    workplan_id: WorkPlanManager.currentWorkplanId,
                    title: goalData.title,
                    goal_letter: goalData.letter,
                    goal_description: goalData.description,
                    nonce: wpm_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        $goalItem.attr('data-goal-id', response.data.goal_id);
                        $goalItem.find('.goal-id').val(response.data.goal_id);
                        WorkPlanManager.sortGoals();
                        WorkPlanManager.updatePreview();
                        alert('Goal saved successfully!');
                    } else {
                        alert('Failed to save goal: ' + response.data);
                    }
                    WorkPlanManager.hideLoading();
                },
                error: function() {
                    alert('An error occurred while saving the goal.');
                    WorkPlanManager.hideLoading();
                }
            });
        },
        
        deleteGoal: function() {
            if (!confirm('Are you sure you want to delete this goal and all its objectives?')) {
                return;
            }
            
            const $goalItem = $(this).closest('.wpm-goal-item');
            const goalId = $goalItem.find('.goal-id').val();
            
            if (goalId && goalId !== '0') {
                WorkPlanManager.showLoading();
                
                $.ajax({
                    url: wpm_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'delete_goal',
                        goal_id: goalId,
                        nonce: wpm_ajax.nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            $goalItem.remove();
                            WorkPlanManager.updatePreview();
                        } else {
                            alert('Failed to delete goal: ' + response.data);
                        }
                        WorkPlanManager.hideLoading();
                    },
                    error: function() {
                        alert('An error occurred while deleting the goal.');
                        WorkPlanManager.hideLoading();
                    }
                });
            } else {
                $goalItem.remove();
                WorkPlanManager.updatePreview();
            }
        },
        
        duplicateGoal: function() {
            const $goalItem = $(this).closest('.wpm-goal-item');
            const goalData = WorkPlanManager.getGoalFormData($goalItem);
            
            const goalLetter = WorkPlanManager.getNextAvailableGoalLetter();
            
            const duplicatedGoalHtml = WorkPlanManager.getGoalTemplate({
                goal_id: '0',
                goal_title: goalData.title + ' (Copy)',
                goal_letter: goalLetter,
                goal_description: goalData.description
            });
            
            $goalItem.after(duplicatedGoalHtml);
            const $newGoal = $goalItem.next('.wpm-goal-item');
            $newGoal.find('.goal-letter-select').val(goalLetter);
        },
        
        addNewObjective: function() {
            const $goalItem = $(this).closest('.wpm-goal-item');
            const objectiveNumber = WorkPlanManager.getNextAvailableObjectiveNumber($goalItem);
            
            const objectiveHtml = WorkPlanManager.getObjectiveTemplate({
                objective_id: '0',
                objective_title: '',
                objective_number: objectiveNumber,
                objective_description: '',
                timeline_description: '',
                measureable_outcomes: ''
            });
            
            $goalItem.find('.wpm-objectives-container').append(objectiveHtml);
        },
        
        saveObjective: function() {
            const $objectiveItem = $(this).closest('.wpm-objective-item');
            const $goalItem = $objectiveItem.closest('.wpm-goal-item');
            const goalId = $goalItem.find('.goal-id').val();
            const objectiveData = WorkPlanManager.getObjectiveFormData($objectiveItem);
            
            if (!objectiveData.title.trim()) {
                alert('Please enter an objective title.');
                return;
            }
            
            if (!goalId || goalId === '0') {
                alert('Please save the parent goal first.');
                return;
            }
            
            // Validate for duplicate number
            if (!WorkPlanManager.isObjectiveNumberUnique(objectiveData.number, objectiveData.id, $goalItem)) {
                alert('Objective number "' + objectiveData.number + '" is already in use in this goal. Please select a different number.');
                return;
            }
            
            // Validate output letters for duplicates
            const duplicateOutputs = WorkPlanManager.findDuplicateOutputLetters(objectiveData.outputs);
            if (duplicateOutputs.length > 0) {
                alert('Duplicate output letters found: ' + duplicateOutputs.join(', ') + '. Please use unique letters for each output.');
                return;
            }
            
            WorkPlanManager.showLoading();
            
            $.ajax({
                url: wpm_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'save_objective',
                    objective_id: objectiveData.id,
                    goal_id: goalId,
                    workplan_id: WorkPlanManager.currentWorkplanId,
                    title: objectiveData.title,
                    objective_number: objectiveData.number,
                    objective_description: objectiveData.description,
                    timeline_description: objectiveData.timeline_description,
                    measureable_outcomes: objectiveData.measureable_outcomes,
                    outputs: JSON.stringify(objectiveData.outputs),
                    nonce: wpm_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        $objectiveItem.attr('data-objective-id', response.data.objective_id);
                        $objectiveItem.find('.objective-id').val(response.data.objective_id);
                        WorkPlanManager.sortObjectives($goalItem);
                        WorkPlanManager.updatePreview();
                        alert('Objective saved successfully!');
                    } else {
                        alert('Failed to save objective: ' + response.data);
                    }
                    WorkPlanManager.hideLoading();
                },
                error: function() {
                    alert('An error occurred while saving the objective.');
                    WorkPlanManager.hideLoading();
                }
            });
        },
        
        deleteObjective: function() {
            if (!confirm('Are you sure you want to delete this objective?')) {
                return;
            }
            
            const $objectiveItem = $(this).closest('.wpm-objective-item');
            const objectiveId = $objectiveItem.find('.objective-id').val();
            
            if (objectiveId && objectiveId !== '0') {
                WorkPlanManager.showLoading();
                
                $.ajax({
                    url: wpm_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'delete_objective',
                        objective_id: objectiveId,
                        nonce: wpm_ajax.nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            $objectiveItem.remove();
                            WorkPlanManager.updatePreview();
                        } else {
                            alert('Failed to delete objective: ' + response.data);
                        }
                        WorkPlanManager.hideLoading();
                    },
                    error: function() {
                        alert('An error occurred while deleting the objective.');
                        WorkPlanManager.hideLoading();
                    }
                });
            } else {
                $objectiveItem.remove();
                WorkPlanManager.updatePreview();
            }
        },
        
        duplicateObjective: function() {
            const $objectiveItem = $(this).closest('.wpm-objective-item');
            const $goalItem = $objectiveItem.closest('.wpm-goal-item');
            const objectiveData = WorkPlanManager.getObjectiveFormData($objectiveItem);
            
            const objectiveNumber = WorkPlanManager.getNextAvailableObjectiveNumber($goalItem);
            
            const duplicatedObjectiveHtml = WorkPlanManager.getObjectiveTemplate({
                objective_id: '0',
                objective_title: objectiveData.title + ' (Copy)',
                objective_number: objectiveNumber,
                objective_description: objectiveData.description,
                timeline_description: objectiveData.timeline_description,
                measureable_outcomes: objectiveData.measureable_outcomes
            });
            
            $objectiveItem.after(duplicatedObjectiveHtml);
            
            // Duplicate outputs
            const $newObjective = $objectiveItem.next('.wpm-objective-item');
            objectiveData.outputs.forEach(function(output) {
                WorkPlanManager.addOutputToObjective($newObjective, output);
            });
        },
        
        addNewOutput: function() {
            const $objectiveItem = $(this).closest('.wpm-objective-item');
            const outputLetter = WorkPlanManager.getNextAvailableOutputLetter($objectiveItem);
            WorkPlanManager.addOutputToObjective($objectiveItem, {
                output_letter: outputLetter,
                output_description: ''
            });
        },
        
        addOutputToObjective: function($objectiveItem, outputData) {
            outputData = outputData || { output_letter: '', output_description: '' };
            
            const outputHtml = WorkPlanManager.getOutputTemplate({
                output_letter: outputData.output_letter,
                output_description: outputData.output_description
            });
            
            $objectiveItem.find('.wpm-outputs-container').append(outputHtml);
        },
        
        removeOutput: function() {
            $(this).closest('.wpm-output-row').remove();
        },
        
        handleGoalReorder: function() {
            const $select = $(this);
            const $goalItem = $select.closest('.wpm-goal-item');
            const selectedLetter = $select.val();
            const currentGoalId = $goalItem.find('.goal-id').val();
            
            $goalItem.find('.goal-letter').text(selectedLetter);
            
            // Check for duplicates
            if (!WorkPlanManager.isGoalLetterUnique(selectedLetter, currentGoalId)) {
                alert('Goal letter "' + selectedLetter + '" is already used. Please select a different letter.');
                const newLetter = WorkPlanManager.getNextAvailableGoalLetter();
                $select.val(newLetter);
                $goalItem.find('.goal-letter').text(newLetter);
                return;
            }
            
            // Sort goals after change
            WorkPlanManager.sortGoals();
            WorkPlanManager.updatePreview();
        },
        
        handleObjectiveReorder: function() {
            const $input = $(this);
            const $objectiveItem = $input.closest('.wpm-objective-item');
            const $goalItem = $objectiveItem.closest('.wpm-goal-item');
            const selectedNumber = parseInt($input.val());
            const currentObjectiveId = $objectiveItem.find('.objective-id').val();
            
            if (!selectedNumber) return;
            
            $objectiveItem.find('.objective-number').text(selectedNumber);
            
            // Check for duplicates
            if (!WorkPlanManager.isObjectiveNumberUnique(selectedNumber, currentObjectiveId, $goalItem)) {
                alert('Objective number "' + selectedNumber + '" is already used in this goal. Please select a different number.');
                const newNumber = WorkPlanManager.getNextAvailableObjectiveNumber($goalItem);
                $input.val(newNumber);
                $objectiveItem.find('.objective-number').text(newNumber);
                return;
            }
            
            // Sort objectives after change
            WorkPlanManager.sortObjectives($goalItem);
            WorkPlanManager.updatePreview();
        },
        
        handleOutputReorder: function() {
            const $input = $(this);
            const $objectiveItem = $input.closest('.wpm-objective-item');
            const selectedLetter = $input.val().toUpperCase();
            const $currentRow = $input.closest('.wpm-output-row');
            
            if (!selectedLetter) return;
            
            // Update to uppercase
            $input.val(selectedLetter);
            
            // Check for duplicates
            let duplicateCount = 0;
            $objectiveItem.find('.wpm-output-row').each(function() {
                const $row = $(this);
                if ($row[0] !== $currentRow[0]) {
                    const rowLetter = $row.find('.output-letter').val().toUpperCase();
                    if (rowLetter === selectedLetter) {
                        duplicateCount++;
                    }
                }
            });
            
            if (duplicateCount > 0) {
                alert('Output letter "' + selectedLetter + '" is already used in this objective. Please use a different letter.');
                const newLetter = WorkPlanManager.getNextAvailableOutputLetter($objectiveItem);
                $input.val(newLetter);
                return;
            }
            
            // Sort outputs after change
            WorkPlanManager.sortOutputs($objectiveItem);
            WorkPlanManager.updatePreview();
        },
        
        sortGoals: function() {
            const $container = $('#goals-container');
            const $goals = $container.find('.wpm-goal-item').sort(function(a, b) {
                const letterA = $(a).find('.goal-letter-select').val();
                const letterB = $(b).find('.goal-letter-select').val();
                return letterA.localeCompare(letterB);
            });
            
            $container.empty().append($goals);
        },
        
        sortObjectives: function($goalItem) {
            const $container = $goalItem.find('.wpm-objectives-container');
            const $objectives = $container.find('.wpm-objective-item').sort(function(a, b) {
                const numA = parseInt($(a).find('.objective-number-input').val()) || 999;
                const numB = parseInt($(b).find('.objective-number-input').val()) || 999;
                return numA - numB;
            });
            
            $container.empty().append($objectives);
        },
        
        sortOutputs: function($objectiveItem) {
            const $container = $objectiveItem.find('.wpm-outputs-container');
            const $outputs = $container.find('.wpm-output-row').sort(function(a, b) {
                const letterA = $(a).find('.output-letter').val().toUpperCase();
                const letterB = $(b).find('.output-letter').val().toUpperCase();
                return letterA.localeCompare(letterB);
            });
            
            $container.empty().append($outputs);
        },
        
        isGoalLetterUnique: function(letter, excludeId) {
            let isUnique = true;
            $('.wpm-goal-item').each(function() {
                const $goal = $(this);
                const goalId = $goal.find('.goal-id').val();
                const goalLetter = $goal.find('.goal-letter-select').val();
                
                if (goalId !== excludeId && goalLetter === letter) {
                    isUnique = false;
                    return false;
                }
            });
            return isUnique;
        },
        
        isObjectiveNumberUnique: function(number, excludeId, $goalItem) {
            let isUnique = true;
            $goalItem.find('.wpm-objective-item').each(function() {
                const $objective = $(this);
                const objectiveId = $objective.find('.objective-id').val();
                const objectiveNumber = parseInt($objective.find('.objective-number-input').val());
                
                if (objectiveId !== excludeId && objectiveNumber === parseInt(number)) {
                    isUnique = false;
                    return false;
                }
            });
            return isUnique;
        },
        
        findDuplicateOutputLetters: function(outputs) {
            const letters = {};
            const duplicates = [];
            
            outputs.forEach(function(output) {
                const letter = output.output_letter.toUpperCase();
                if (letter) {
                    if (letters[letter]) {
                        if (duplicates.indexOf(letter) === -1) {
                            duplicates.push(letter);
                        }
                    } else {
                        letters[letter] = true;
                    }
                }
            });
            
            return duplicates;
        },
        
        getNextAvailableGoalLetter: function() {
            const usedLetters = [];
            $('.wpm-goal-item').each(function() {
                const letter = $(this).find('.goal-letter-select').val();
                if (letter) {
                    usedLetters.push(letter);
                }
            });
            
            for (let i = 65; i <= 90; i++) {
                const letter = String.fromCharCode(i);
                if (usedLetters.indexOf(letter) === -1) {
                    return letter;
                }
            }
            
            return 'A';
        },
        
        getNextAvailableObjectiveNumber: function($goalItem) {
            const usedNumbers = [];
            $goalItem.find('.wpm-objective-item').each(function() {
                const number = parseInt($(this).find('.objective-number-input').val());
                if (!isNaN(number)) {
                    usedNumbers.push(number);
                }
            });
            
            for (let i = 1; i <= 100; i++) {
                if (usedNumbers.indexOf(i) === -1) {
                    return i;
                }
            }
            
            return 1;
        },
        
        getNextAvailableOutputLetter: function($objectiveItem) {
            const usedLetters = [];
            $objectiveItem.find('.output-letter').each(function() {
                const letter = $(this).val().toUpperCase();
                if (letter) {
                    usedLetters.push(letter);
                }
            });
            
            // Use uppercase letters A-Z
            for (let i = 65; i <= 90; i++) {
                const letter = String.fromCharCode(i);
                if (usedLetters.indexOf(letter) === -1) {
                    return letter;
                }
            }
            
            return 'A';
        },
        
        handleAutoSave: function() {
            // Implement auto-save functionality if needed
        },
        
        exportWorkplan: function(format) {
            if (!WorkPlanManager.currentWorkplanId) {
                alert('Please save the work plan first before exporting.');
                return;
            }
            
            WorkPlanManager.showLoading();
            
            $.ajax({
                url: wpm_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'export_workplan',
                    workplan_id: WorkPlanManager.currentWorkplanId,
                    format: format,
                    nonce: wpm_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        window.open(response.data.download_url, '_blank');
                    } else {
                        alert('Failed to export work plan: ' + response.data);
                    }
                    WorkPlanManager.hideLoading();
                },
                error: function() {
                    alert('An error occurred while exporting the work plan.');
                    WorkPlanManager.hideLoading();
                }
            });
        },
        
        updatePreview: function() {
            const workplanData = WorkPlanManager.collectWorkplanData();
            WorkPlanManager.renderPreview(workplanData);
        },
        
        collectWorkplanData: function() {
            // Get title with year appended
            let title = $('#workplan-title').val();
            const publishDate = $('#workplan-date').val();
            const year = publishDate ? new Date(publishDate).getFullYear() : new Date().getFullYear();
            
            // Remove any existing year and add current year
            title = title.replace(/\s*-\s*\d{4}$/, '');
            title = title + ' - ' + year;
            
            const workplanData = {
                id: WorkPlanManager.currentWorkplanId,
                title: title,
                author: $('#workplan-author').val(),
                grant_year: $('#grant-year option:selected').text() || '',
                group: $('#workplan-group option:selected').text() || '',
                internal_status: $('#internal-status').val() || '',
                goals: []
            };
            
            // Sort goals before collecting
            const $sortedGoals = $('.wpm-goal-item').sort(function(a, b) {
                const letterA = $(a).find('.goal-letter-select').val();
                const letterB = $(b).find('.goal-letter-select').val();
                return letterA.localeCompare(letterB);
            });
            
            $sortedGoals.each(function() {
                const $goalItem = $(this);
                const goalData = WorkPlanManager.getGoalFormData($goalItem);
                goalData.objectives = [];
                
                // Sort objectives before collecting
                const $sortedObjectives = $goalItem.find('.wpm-objective-item').sort(function(a, b) {
                    const numA = parseInt($(a).find('.objective-number-input').val()) || 999;
                    const numB = parseInt($(b).find('.objective-number-input').val()) || 999;
                    return numA - numB;
                });
                
                $sortedObjectives.each(function() {
                    const $objectiveItem = $(this);
                    const objectiveData = WorkPlanManager.getObjectiveFormData($objectiveItem);
                    
                    // Sort outputs
                    objectiveData.outputs.sort(function(a, b) {
                        return a.output_letter.toUpperCase().localeCompare(b.output_letter.toUpperCase());
                    });
                    
                    goalData.objectives.push(objectiveData);
                });
                
                workplanData.goals.push(goalData);
            });
            
            return workplanData;
        },
        
        getGoalFormData: function($goalItem) {
            return {
                id: $goalItem.find('.goal-id').val(),
                title: $goalItem.find('.goal-title').val(),
                letter: $goalItem.find('.goal-letter-select').val(),
                description: $goalItem.find('.goal-description').val()
            };
        },
        
        getObjectiveFormData: function($objectiveItem) {
            const outputs = [];
            $objectiveItem.find('.wpm-output-row').each(function() {
                outputs.push({
                    output_letter: $(this).find('.output-letter').val().toUpperCase(),
                    output_description: $(this).find('.output-description').val()
                });
            });
            
            return {
                id: $objectiveItem.find('.objective-id').val(),
                title: $objectiveItem.find('.objective-title').val(),
                number: $objectiveItem.find('.objective-number-input').val(),
                description: $objectiveItem.find('.objective-description').val(),
                timeline_description: $objectiveItem.find('.timeline-description').val(),
                measureable_outcomes: $objectiveItem.find('.measureable-outcomes').val(),
                outputs: outputs
            };
        },
        
        populateGoals: function(goals) {
            $('#goals-container').empty();
            
            if (!goals || goals.length === 0) {
                return;
            }
            
            // Sort goals by letter before populating
            goals.sort(function(a, b) {
                return (a.goal_letter || 'A').localeCompare(b.goal_letter || 'A');
            });
            
            goals.forEach(function(goal) {
                const goalHtml = WorkPlanManager.getGoalTemplate(goal);
                $('#goals-container').append(goalHtml);
                
                const $goalItem = $('.wpm-goal-item').last();
                $goalItem.find('.goal-letter-select').val(goal.goal_letter || 'A');
                
                // Sort objectives by number before populating
                if (goal.objectives && goal.objectives.length > 0) {
                    goal.objectives.sort(function(a, b) {
                        const numA = parseInt(a.objective_number) || parseInt(a.number) || 999;
                        const numB = parseInt(b.objective_number) || parseInt(b.number) || 999;
                        return numA - numB;
                    });
                    
                    goal.objectives.forEach(function(objective) {
                        const objectiveHtml = WorkPlanManager.getObjectiveTemplate(objective);
                        $goalItem.find('.wpm-objectives-container').append(objectiveHtml);
                        
                        const $objectiveItem = $goalItem.find('.wpm-objective-item').last();
                        
                        // Set the timeline and measurable outcomes values
                        $objectiveItem.find('.timeline-description').val(objective.timeline_description || '');
                        $objectiveItem.find('.measureable-outcomes').val(objective.measureable_outcomes || '');
                        
                        // Sort outputs by letter before populating
                        if (objective.outputs && objective.outputs.length > 0) {
                            objective.outputs.sort(function(a, b) {
                                return (a.output_letter || 'A').toUpperCase().localeCompare((b.output_letter || 'A').toUpperCase());
                            });
                            
                            objective.outputs.forEach(function(output) {
                                // Convert to uppercase
                                output.output_letter = output.output_letter.toUpperCase();
                                WorkPlanManager.addOutputToObjective($objectiveItem, output);
                            });
                        }
                    });
                }
            });
        },
        
        getGoalTemplate: function(data) {
            let template = $('#goal-template').html();
            template = template.replace(/{{goal_id}}/g, data.goal_id || data.id || '0');
            template = template.replace(/{{goal_title}}/g, data.goal_title || data.title || '');
            template = template.replace(/{{goal_letter}}/g, data.goal_letter || 'A');
            template = template.replace(/{{goal_description}}/g, data.goal_description || '');
            return template;
        },
        
        getObjectiveTemplate: function(data) {
            let template = $('#objective-template').html();
            template = template.replace(/{{objective_id}}/g, data.objective_id || data.id || '0');
            template = template.replace(/{{objective_title}}/g, data.objective_title || data.title || '');
            template = template.replace(/{{objective_number}}/g, data.objective_number || data.number || '1');
            template = template.replace(/{{objective_description}}/g, data.objective_description || data.description || '');
            template = template.replace(/{{timeline_description}}/g, data.timeline_description || '');
            template = template.replace(/{{measureable_outcomes}}/g, data.measureable_outcomes || '');
            return template;
        },
        
        getOutputTemplate: function(data) {
            let template = $('#output-template').html();
            template = template.replace(/{{output_letter}}/g, data.output_letter || '');
            template = template.replace(/{{output_description}}/g, data.output_description || '');
            return template;
        },
        
        renderPreview: function(workplanData) {
            const { createElement: e, Component } = wp.element;
            const { render } = wp.element;
            
            class WorkplanPreview extends Component {
                render() {
                    return e('div', { className: 'wpm-preview-table' },
                        e('h3', null, workplanData.title || 'Untitled Work Plan'),
                        e('div', { className: 'wpm-preview-info' },
                            e('p', null, e('strong', null, 'Author: '), workplanData.author),
                            e('p', null, e('strong', null, 'Group: '), workplanData.group || 'Not set'),
                            e('p', null, e('strong', null, 'Grant Year: '), workplanData.grant_year || 'Not set'),
                            e('p', null, e('strong', null, 'Status: '), workplanData.internal_status || 'Draft')
                        ),
                        e('table', { className: 'wpm-preview-data-table' },
                            e('thead', null,
                                e('tr', null,
                                    e('th', null, 'Goal'),
                                    e('th', null, 'Goal Description'),
                                    e('th', null, 'Objective'),
                                    e('th', null, 'Objective Description'),
                                    e('th', null, 'Timeline'),
                                    e('th', null, 'Measurable Outcomes'),
                                    e('th', null, 'Outputs')
                                )
                            ),
                            e('tbody', null,
                                workplanData.goals.length > 0 ?
                                    workplanData.goals.map(goal =>
                                        goal.objectives && goal.objectives.length > 0 ?
                                            goal.objectives.map((objective, objIndex) =>
                                                e('tr', { key: `${goal.id}-${objective.id}-${objIndex}` },
                                                    objIndex === 0 ? e('td', { rowSpan: goal.objectives.length }, `${goal.letter}. ${goal.title}`) : null,
                                                    objIndex === 0 ? e('td', { rowSpan: goal.objectives.length }, goal.description) : null,
                                                    e('td', null, `${objective.number}. ${objective.title}`),
                                                    e('td', null, objective.description),
                                                    e('td', null, objective.timeline_description || ''),
                                                    e('td', null, objective.measureable_outcomes || ''),
                                                    e('td', null,
                                                        objective.outputs && objective.outputs.map((output, outIndex) =>
                                                            output.output_letter || output.output_description ?
                                                                e('div', { key: outIndex }, `${output.output_letter}. ${output.output_description}`)
                                                                : null
                                                        )
                                                    )
                                                )
                                            ) :
                                            e('tr', { key: goal.id },
                                                e('td', null, `${goal.letter}. ${goal.title}`),
                                                e('td', null, goal.description),
                                                e('td', { colSpan: 5 }, 'No objectives defined')
                                            )
                                    ) :
                                    e('tr', null,
                                        e('td', { colSpan: 7, style: { textAlign: 'center', fontStyle: 'italic' } }, 
                                          'No goals have been added yet')
                                    )
                            )
                        )
                    );
                }
            }
            
            const previewContainer = document.getElementById('workplan-preview');
            if (previewContainer) {
                render(e(WorkplanPreview), previewContainer);
            }
        }
    };
    
    // Initialize the Work Plan Manager
    WorkPlanManager.init();
});