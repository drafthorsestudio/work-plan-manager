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
            
            // Auto-update goal letters and objective numbers
            $(document).on('change', '.goal-letter-select', this.updateGoalLetter);
            $(document).on('change', '.objective-number-input', this.updateObjectiveNumber);
            
            // Auto-save functionality
            $(document).on('blur', 'input, textarea, select', this.handleAutoSave);
        },
        
        initializeComponents: function() {
            // Initialize any additional components here
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
            $('#objectives-section').hide();
            $('#preview-section').hide();
            
            // Reset form
            $('#workplan-id').val('0');
            $('#workplan-title').val('');
            $('#grant-year').val('');
            $('#grant-quarter').val('');
            $('#workplan-group').val('');
            $('#internal-status').val('Draft');
            
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
            $('#workplan-title').val(data.title);
            
            // Set Internal Status ACF field
            $('#internal-status').val(data.internal_status || 'Draft');
            
            // Set Group taxonomy - find the option by matching the term name
            if (data.group && data.group.length > 0) {
                const groupName = data.group[0];
                $('#workplan-group option').each(function() {
                    if ($(this).text().trim() === groupName.trim()) {
                        $(this).prop('selected', true);
                    }
                });
            }
            
            // Set Grant Year taxonomy - find the option by matching the term name
            if (data.grant_year && data.grant_year.length > 0) {
                const yearName = data.grant_year[0];
                $('#grant-year option').each(function() {
                    if ($(this).text().trim() === yearName.trim()) {
                        $(this).prop('selected', true);
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
            const title = $('#workplan-title').val().trim();
            if (!title) {
                alert('Please enter a work plan title.');
                return;
            }
            
            WorkPlanManager.showLoading();
            
            $.ajax({
                url: wpm_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'save_workplan',
                    workplan_id: $('#workplan-id').val(),
                    title: title,
                    grant_year: $('#grant-year').val(),
                    group: $('#workplan-group').val(),
                    internal_status: $('#internal-status').val(),
                    nonce: wpm_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        WorkPlanManager.currentWorkplanId = response.data.workplan_id;
                        $('#workplan-id').val(response.data.workplan_id);
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
            const goalCount = $('.wpm-goal-item').length;
            const goalLetter = String.fromCharCode(65 + goalCount); // A, B, C, etc.
            
            const goalHtml = WorkPlanManager.getGoalTemplate({
                goal_id: '0',
                goal_title: '',
                goal_letter: goalLetter,
                goal_description: '',
                timeline_description: ''
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
                            WorkPlanManager.updateGoalLetters();
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
                WorkPlanManager.updateGoalLetters();
                WorkPlanManager.updatePreview();
            }
        },
        
        duplicateGoal: function() {
            const $goalItem = $(this).closest('.wpm-goal-item');
            const goalData = WorkPlanManager.getGoalFormData($goalItem);
            
            const goalCount = $('.wpm-goal-item').length;
            const goalLetter = String.fromCharCode(65 + goalCount);
            
            const duplicatedGoalHtml = WorkPlanManager.getGoalTemplate({
                goal_id: '0',
                goal_title: goalData.title + ' (Copy)',
                goal_letter: goalLetter,
                goal_description: goalData.description
            });
            
            $goalItem.after(duplicatedGoalHtml);
            WorkPlanManager.updateGoalLetters();
        },
        
        addNewObjective: function() {
            const $goalItem = $(this).closest('.wpm-goal-item');
            const objectiveCount = $goalItem.find('.wpm-objective-item').length;
            const objectiveNumber = objectiveCount + 1;
            
            const objectiveHtml = WorkPlanManager.getObjectiveTemplate({
                objective_id: '0',
                objective_title: '',
                objective_number: objectiveNumber,
                objective_description: ''
            });
            
            $goalItem.find('.wpm-objectives-container').append(objectiveHtml);
            $('#objectives-section').show();
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
                            WorkPlanManager.updateObjectiveNumbers();
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
                WorkPlanManager.updateObjectiveNumbers();
                WorkPlanManager.updatePreview();
            }
        },
        
        duplicateObjective: function() {
            const $objectiveItem = $(this).closest('.wpm-objective-item');
            const $goalItem = $objectiveItem.closest('.wpm-goal-item');
            const objectiveData = WorkPlanManager.getObjectiveFormData($objectiveItem);
            
            const objectiveCount = $goalItem.find('.wpm-objective-item').length;
            const objectiveNumber = objectiveCount + 1;
            
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
            
            WorkPlanManager.updateObjectiveNumbers();
        },
        
        addNewOutput: function() {
            const $objectiveItem = $(this).closest('.wpm-objective-item');
            WorkPlanManager.addOutputToObjective($objectiveItem);
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
        
        updateGoalLetter: function() {
            const $select = $(this);
            const $goalItem = $select.closest('.wpm-goal-item');
            const selectedLetter = $select.val();
            
            $goalItem.find('.goal-letter').text(selectedLetter);
            WorkPlanManager.updatePreview();
        },
        
        updateObjectiveNumber: function() {
            const $input = $(this);
            const $objectiveItem = $input.closest('.wpm-objective-item');
            const selectedNumber = $input.val();
            
            $objectiveItem.find('.objective-number').text(selectedNumber);
            WorkPlanManager.updatePreview();
        },
        
        updateGoalLetters: function() {
            $('.wpm-goal-item').each(function(index) {
                const letter = String.fromCharCode(65 + index);
                $(this).find('.goal-letter').text(letter);
                $(this).find('.goal-letter-select').val(letter);
            });
            WorkPlanManager.updatePreview();
        },
        
        updateObjectiveNumbers: function() {
            $('.wpm-goal-item').each(function() {
                $(this).find('.wpm-objective-item').each(function(index) {
                    const number = index + 1;
                    $(this).find('.objective-number').text(number);
                    $(this).find('.objective-number-input').val(number);
                });
            });
            WorkPlanManager.updatePreview();
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
                        // Handle file download
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
            // This will be implemented using React components
            const workplanData = WorkPlanManager.collectWorkplanData();
            WorkPlanManager.renderPreview(workplanData);
        },
        
        validateGoalLetter: function() {
            const $select = $(this);
            const $goalItem = $select.closest('.wpm-goal-item');
            const selectedLetter = $select.val();
            const currentGoalId = $goalItem.find('.goal-id').val();
            
            if (!selectedLetter) return;
            
            // Check for duplicates in other goals
            let isDuplicate = false;
            $('.wpm-goal-item').each(function() {
                const $otherGoal = $(this);
                const otherGoalId = $otherGoal.find('.goal-id').val();
                const otherLetter = $otherGoal.find('.goal-letter-select').val();
                
                if (currentGoalId !== otherGoalId && selectedLetter === otherLetter) {
                    isDuplicate = true;
                    return false;
                }
            });
            
            if (isDuplicate) {
                alert('Goal letter "' + selectedLetter + '" is already used. Please select a different letter.');
                WorkPlanManager.suggestNextGoalLetter($goalItem);
            }
        },
        
        validateObjectiveNumber: function() {
            const $input = $(this);
            const $objectiveItem = $input.closest('.wpm-objective-item');
            const $goalItem = $objectiveItem.closest('.wpm-goal-item');
            const selectedNumber = parseInt($input.val());
            const currentObjectiveId = $objectiveItem.find('.objective-id').val();
            
            if (!selectedNumber) return;
            
            // Check for duplicates in other objectives within the same goal
            let isDuplicate = false;
            $goalItem.find('.wpm-objective-item').each(function() {
                const $otherObjective = $(this);
                const otherObjectiveId = $otherObjective.find('.objective-id').val();
                const otherNumber = parseInt($otherObjective.find('.objective-number-input').val());
                
                if (currentObjectiveId !== otherObjectiveId && selectedNumber === otherNumber) {
                    isDuplicate = true;
                    return false;
                }
            });
            
            if (isDuplicate) {
                alert('Objective number "' + selectedNumber + '" is already used in this goal. Please select a different number.');
                WorkPlanManager.suggestNextObjectiveNumber($goalItem, $objectiveItem);
            }
        },
        
        validateOutputLetter: function() {
            const $input = $(this);
            const $objectiveItem = $input.closest('.wpm-objective-item');
            const selectedLetter = $input.val().toLowerCase();
            const $currentRow = $input.closest('.wpm-output-row');
            
            if (!selectedLetter) return;
            
            // Check for duplicates in other output rows within the same objective
            let duplicateCount = 0;
            $objectiveItem.find('.wpm-output-row').each(function() {
                const $row = $(this);
                const rowLetter = $row.find('.output-letter').val().toLowerCase();
                if (rowLetter === selectedLetter) {
                    duplicateCount++;
                }
            });
            
            if (duplicateCount > 1) {
                alert('Output letter "' + selectedLetter + '" is already used in this objective. Please select a different letter.');
                $input.val('').focus();
            }
        },
        
        suggestNextGoalLetter: function($goalItem) {
            const usedLetters = [];
            $('.wpm-goal-item').each(function() {
                const letter = $(this).find('.goal-letter-select').val();
                if (letter && letter.trim()) {
                    usedLetters.push(letter.trim());
                }
            });
            
            // Find first available letter A-Z
            for (let i = 65; i <= 90; i++) {
                const letter = String.fromCharCode(i);
                if (!usedLetters.includes(letter)) {
                    $goalItem.find('.goal-letter-select').val(letter);
                    $goalItem.find('.goal-letter').text(letter);
                    return;
                }
            }
            
            // If all letters used, just set to A
            $goalItem.find('.goal-letter-select').val('A');
            $goalItem.find('.goal-letter').text('A');
        },
        
        suggestNextObjectiveNumber: function($goalItem, $objectiveItem) {
            const usedNumbers = [];
            $goalItem.find('.wpm-objective-item').each(function() {
                const number = parseInt($(this).find('.objective-number-input').val());
                if (!isNaN(number)) {
                    usedNumbers.push(number);
                }
            });
            
            // Find first available number starting from 1
            let suggestedNumber = 1;
            while (usedNumbers.includes(suggestedNumber)) {
                suggestedNumber++;
            }
            
            $objectiveItem.find('.objective-number-input').val(suggestedNumber);
            $objectiveItem.find('.objective-number').text(suggestedNumber);
        },
        
        collectWorkplanData: function() {
            const workplanData = {
                id: WorkPlanManager.currentWorkplanId,
                title: $('#workplan-title').val(),
                author: $('#workplan-author').val(),
                grant_year: $('#grant-year option:selected').text() || '',
                group: $('#workplan-group option:selected').text() || '',
                internal_status: $('#internal-status').val() || '',
                goals: []
            };
            
            $('.wpm-goal-item').each(function() {
                const $goalItem = $(this);
                const goalData = WorkPlanManager.getGoalFormData($goalItem);
                goalData.objectives = [];
                
                $goalItem.find('.wpm-objective-item').each(function() {
                    const $objectiveItem = $(this);
                    const objectiveData = WorkPlanManager.getObjectiveFormData($objectiveItem);
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
                    output_letter: $(this).find('.output-letter').val(),
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
            
            goals.forEach(function(goal) {
                const goalHtml = WorkPlanManager.getGoalTemplate(goal);
                $('#goals-container').append(goalHtml);
                
                const $goalItem = $('.wpm-goal-item').last();
                $goalItem.find('.goal-letter-select').val(goal.goal_letter || 'A');
                
                // Populate objectives
                if (goal.objectives && goal.objectives.length > 0) {
                    goal.objectives.forEach(function(objective) {
                        const objectiveHtml = WorkPlanManager.getObjectiveTemplate(objective);
                        $goalItem.find('.wpm-objectives-container').append(objectiveHtml);
                        
                        const $objectiveItem = $goalItem.find('.wpm-objective-item').last();
                        
                        // Set the timeline and measurable outcomes values
                        $objectiveItem.find('.timeline-description').val(objective.timeline_description || '');
                        $objectiveItem.find('.measureable-outcomes').val(objective.measureable_outcomes || '');
                        
                        // Populate outputs
                        if (objective.outputs && objective.outputs.length > 0) {
                            objective.outputs.forEach(function(output) {
                                WorkPlanManager.addOutputToObjective($objectiveItem, output);
                            });
                        }
                    });
                }
            });
            
            if (goals.length > 0) {
                $('#objectives-section').show();
            }
        },
        
        getGoalTemplate: function(data) {
            let template = $('#goal-template').html();
            template = template.replace(/{{goal_id}}/g, data.goal_id || '0');
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
            // Using WordPress React components for the preview
            const { createElement: e, Component } = wp.element;
            const { render } = wp.element;
            
            class WorkplanPreview extends Component {
                render() {
                    return e('div', { className: 'wmp-preview-table' },
                        e('h3', null, workplanData.title),
                        e('div', { className: 'wpm-preview-info' },
                            e('p', null, `Author: ${workplanData.author}`),
                            e('p', null, `Group: ${workplanData.group}`),
                            e('p', null, `Grant Year: ${workplanData.grant_year}`),
                            e('p', null, `Status: ${workplanData.internal_status}`)
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
                                                        e('div', { key: outIndex }, `${output.output_letter}. ${output.output_description}`)
                                                    )
                                                )
                                            )
                                        ) :
                                        e('tr', { key: goal.id },
                                            e('td', null, `${goal.letter}. ${goal.title}`),
                                            e('td', null, goal.description),
                                            e('td', { colSpan: 5 }, 'No objectives defined')
                                        )
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