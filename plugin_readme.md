# Work Plan Manager WordPress Plugin

A comprehensive WordPress plugin that provides an alternate interface to manage three related post types (Work Plans, Goals, and Objectives). The plugin works with your existing ACF field configurations and post types to streamline data entry and allow administrators to manage everything on one admin page.

## Features

- **Streamlined Interface**: Manage Work Plans, Goals, and Objectives from a single admin page
- **Role-Based Access Control**: Integration with PublishPress Permissions for group-based access
- **Works with Existing Setup**: Uses your existing post types, taxonomies, and ACF field configurations
- **Real-Time Preview**: React-based preview interface showing data relationships
- **Export Functionality**: Export completed work plans to Excel or CSV format
- **Responsive Design**: Clean, modern interface that works on all devices
- **Data Validation**: Built-in validation for unique goal letters and objective numbers

## Requirements

### System Requirements
- **PHP**: 7.4 or higher
- **WordPress**: 5.0 or higher
- **MySQL**: 5.6 or higher

### Required Plugins
- **Advanced Custom Fields (ACF)**: Free or Pro version with existing field configurations

### Required Post Types (must already exist)
- `workplan` - Work Plan post type
- `workplan-goal` - Work Plan Goal post type  
- `workplan-objective` - Work Plan Objective post type

### Required Taxonomies (must already exist)
- `grant-year` - Grant Year taxonomy (hierarchical)
- `group` - Group taxonomy for role-based access

### Required ACF Fields (must already exist)
The plugin expects these ACF fields to be configured:

**Work Plan Fields:**
- `internal_status` - Select field (Draft, Submitted, Approved, Locked)
- `related_work_plan_goals` - Relationship field to workplan-goal posts

**Work Plan Goal Fields:**
- `goal_letter` - Select field (A-Z)
- `goal_description` - Textarea field
- `work_plan_objectives` - Relationship field to workplan-objective posts

**Work Plan Objective Fields:**
- `objective_number` - Number field
- `objective_description` - Textarea field
- `timeline_description` - Text field (moved from Goals)
- `measureable_outcomes` - Textarea field (new field)
- `objective_outputs` - Repeater field with:
  - `output_letter` - Text field
  - `output_description` - Textarea field

### Data Structure Notes
The plugin uses ACF relationship fields to connect the post types:
- **Work Plans** contain a `related_work_plan_goals` field that links to multiple Goal posts
- **Goals** contain a `work_plan_objectives` field that links to multiple Objective posts  
- **Objectives** contain timeline and measurable outcomes information
- This creates a parent-to-child relationship structure (Work Plan → Goals → Objectives)
- The plugin does NOT use WordPress's built-in post parent functionality

### Field Structure Changes
Recent updates have modified the field structure:
- ✅ **Grant quarters eliminated** - Only grant year taxonomy is used (no sub-levels)
- ✅ **Timeline moved** - `timeline_description` moved from Goals to Objectives
- ✅ **New field added** - `measureable_outcomes` textarea added to Objectives
- ✅ **Duplicate validation** - Built-in checks prevent duplicate goal letters, objective numbers, and output letters

### Optional Plugins
- **PublishPress Permissions**: For role-based access control

## Installation

1. **Ensure Prerequisites**
   - Verify all required post types, taxonomies, and ACF fields exist
   - Ensure Advanced Custom Fields is installed and active

2. **Upload Plugin Files**
   ```
   /wp-content/plugins/work-plan-manager/
   ├── work-plan-manager.php (main plugin file)
   ├── css/
   │   └── work-plan-manager.css
   ├── js/
   │   └── work-plan-manager.js
   └── includes/
       ├── admin-page.php
       ├── export-handler.php
       ├── utility-functions.php
       ├── installation.php
       └── acf-behaviors.php (optional)
   ```

3. **Activate the Plugin**
   - Go to WordPress Admin → Plugins
   - Find "Work Plan Manager" and click "Activate"
   - The plugin will check for required dependencies and show warnings if anything is missing

4. **Optional: Enable ACF Field Enhancements**
   - If you want additional validation and automation features
   - Edit `work-plan-manager.php` and uncomment this line:
   ```php
   // require_once WPM_PLUGIN_PATH . 'includes/acf-behaviors.php';
   ```
   - This adds validation for unique goal letters/objective numbers and auto-populates taxonomies

5. **Configure Permissions**
   - The plugin adds `manage_workplans` capability to administrators
   - Add this capability to other roles as needed

## Post Types and Taxonomies

### Custom Post Types

1. **Work Plan** (`workplan`)
   - Main container for all related goals and objectives
   - Contains basic information and status tracking

2. **Work Plan Goal** (`workplan-goal`)
   - Child of Work Plan
   - Represents individual goals within a work plan
   - Each goal has a letter designation (A, B, C, etc.)

3. **Work Plan Objective** (`workplan-objective`)
   - Child of Work Plan Goal
   - Represents specific objectives under each goal
   - Each objective has a numeric designation (1, 2, 3, etc.)
   - Contains repeatable outputs

### Custom Taxonomies

1. **Grant Year** (`grant-year`)
   - Hierarchical taxonomy
   - Level 1: Years (Y1, Y2, Y3, etc.)
   - Level 2: Quarters (Q1, Q2, Q3, Q4)

2. **Group** (`group`)
   - Non-hierarchical taxonomy
   - Used for role-based access control
   - Maps to PublishPress user groups

## Custom Fields (ACF)

### Work Plan Fields
- **Internal Status**: Select field with options (Draft, Submitted, Approved, Locked)

### Work Plan Goal Fields
- **Goal Letter**: Select field (A-Z)
- **Goal Description**: Textarea for detailed description
- **Timeline Description**: Text field for timeline information
- **Work Plan Relationship**: Relationship field linking to parent Work Plan

### Work Plan Objective Fields
- **Objective Number**: Number field (1-100)
- **Objective Description**: Textarea for detailed description
- **Objective Outputs**: Repeater field containing:
  - **Output Letter**: Text field (a, b, c, etc.)
  - **Output Description**: Textarea
- **Goal Relationship**: Relationship field linking to parent Goal
- **Work Plan Relationship**: Relationship field linking to parent Work Plan

## Usage

### Accessing the Plugin

1. Navigate to **Work Plans** in the WordPress admin menu
2. The main interface will load with options to create or select existing work plans

### Creating a New Work Plan

1. Click **"Add New Work Plan"** button
2. Fill in the required fields:
   - Work Plan Title
   - Grant Year and Quarter
   - Group (based on your permissions)
   - Internal Status
3. Click **"Save Work Plan"**

### Adding Goals

1. After saving a Work Plan, the Goals section will appear
2. Click **"Add New Goal"** to create a goal
3. Fill in the goal information:
   - Goal Title
   - Goal Letter (automatically assigned)
   - Goal Description
   - Timeline Description
4. Click **"Save Goal"**

### Adding Objectives

1. After saving a Goal, click **"Add Objective"**
2. Fill in the objective information:
   - Objective Title
   - Objective Number (automatically assigned)
   - Objective Description
3. Add outputs using the **"Add Output"** button
4. Click **"Save Objective"**

### Managing Existing Work Plans

1. Use the dropdown to select an existing Work Plan
2. Click **"Load Work Plan"** to edit
3. Make changes as needed
4. Save individual components as you work

### Exporting Work Plans

1. Complete your Work Plan with all Goals and Objectives
2. View the real-time preview at the bottom of the page
3. Click **"Export to Excel"** or **"Export to CSV"**
4. Download will begin automatically

## Role-Based Access Control

### Setting Up Groups

If using PublishPress Permissions:

1. **Create Groups**
   - Go to PublishPress → Groups
   - Create groups matching your organizational structure
   - Examples: "Great Lakes ATTC", "Mid-America ATTC"

2. **Assign Users to Groups**
   - Edit user profiles
   - Assign appropriate groups

3. **Map Groups to Roles**
   The plugin automatically maps these role metagroup_ids:
   - `great_lakes_editor` → "Great Lakes ATTC"
   - `mid_america_editor` → "Mid-America ATTC"
   - `central_east_editor` → "Central East ATTC"

### Permission Structure

**Administrators (users with `edit_others_workplans` capability):**
- ✅ Can see ALL Work Plans, Goals, and Objectives regardless of group
- ✅ Can create Work Plans in any group
- ✅ Can edit any Work Plan, Goal, or Objective
- ✅ Can delete any Work Plan, Goal, or Objective
- ✅ Can export any Work Plan

**Editors (users without `edit_others_workplans` capability):**
- ❌ Can only see Work Plans assigned to their specific groups
- ❌ Can only create Work Plans in their assigned groups
- ❌ Can only edit Work Plans, Goals, and Objectives in their groups
- ❌ Can only delete content in their groups
- ✅ Can export Work Plans they have access to

### Capabilities Structure

The plugin uses these custom capabilities:
- `manage_workplans` - Required to access the plugin interface
- `edit_workplans` - Required to create/edit work plans
- `edit_others_workplans` - Grants administrator-level access (see all content)
- `delete_workplans` - Required to delete goals and objectives

**Default Role Assignments:**
- **Administrator**: All capabilities (full access)
- **Editor**: Limited capabilities (group-restricted access)

## Customization

### Adding Custom CSS

Add custom styles to your theme's `style.css` or use a child theme:

```css
/* Custom Work Plan Manager styles */
.wpm-container {
    /* Your custom styles here */
}
```

### Extending Functionality

The plugin provides several hooks and filters for customization:

```php
// Example: Modify export data before generating file
add_filter('wpm_export_data', function($data, $workplan_id) {
    // Modify $data as needed
    return $data;
}, 10, 2);

// Example: Add custom validation
add_action('wpm_before_save_workplan', function($workplan_data) {
    // Add custom validation logic
});
```

### Custom Fields

To add additional fields:

1. Create new ACF field groups
2. Assign to appropriate post types
3. Update the export functionality to include new fields
4. Modify the JavaScript to handle new fields in the preview

## Troubleshooting

### Common Issues

1. **Plugin Not Appearing in Menu**
   - Check user capabilities
   - Ensure user has "manage_workplans" capability

2. **ACF Fields Not Showing**
   - Verify ACF is installed and activated
   - Ensure all required ACF fields exist and are properly configured
   - Check that field names match exactly: `internal_status`, `related_work_plan_goals`, `goal_letter`, `work_plan_objectives`, etc.

3. **"Required post types not found" Error**
   - Ensure `workplan`, `workplan-goal`, and `workplan-objective` post types exist
   - These should be registered in your theme or another plugin
   - Note: The plugin uses ACF relationship fields rather than WordPress post parent relationships

4. **"Required taxonomies not found" Error**  
   - Ensure `group` and `grant-year` taxonomies exist
   - These should be registered in your theme or another plugin

5. **Export Not Working**
   - Check file permissions on uploads directory
   - Ensure server has sufficient memory and execution time

6. **Permission Errors**
   - Verify PublishPress Permissions configuration (if using)
   - Check group assignments and mappings

### Pre-Installation Checklist

Before activating the plugin, ensure you have:

- [ ] Advanced Custom Fields installed and active
- [ ] `workplan` post type registered
- [ ] `workplan-goal` post type registered  
- [ ] `workplan-objective` post type registered
- [ ] `group` taxonomy registered
- [ ] `grant-year` taxonomy registered
- [ ] All required ACF fields created and assigned to post types

### Debug Mode

Enable WordPress debug mode to see detailed error messages:

```php
// In wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

Check debug logs in `/wp-content/debug.log`

### Support

For technical issues:

1. Check the WordPress error logs
2. Verify all requirements are met
3. Test with default WordPress theme and minimal plugins
4. Check browser console for JavaScript errors

## File Structure

```
work-plan-manager/
├── work-plan-manager.php          # Main plugin file
├── css/
│   └── work-plan-manager.css      # Plugin styles
├── js/
│   └── work-plan-manager.js       # Frontend JavaScript
├── includes/
│   ├── admin-page.php             # Main admin interface
│   ├── export-handler.php         # Export functionality
│   ├── utility-functions.php      # Helper functions
│   ├── installation.php           # Installation & setup
│   └── acf-behaviors.php          # Optional ACF enhancements
└── README.md                      # This documentation
```

## Optional ACF Enhancements

The `acf-behaviors.php` file is **optional** and provides these additional features:

### **Validation Features** (when enabled):
- ✅ **Unique Goal Letters** - Prevents duplicate letters within the same Work Plan
- ✅ **Unique Objective Numbers** - Prevents duplicate numbers within the same Goal
- ✅ **Real-time Validation** - Shows error messages in ACF forms

### **Automation Features** (when enabled):
- ✅ **Auto-populate Taxonomy** - Automatically copies group taxonomy from parent Work Plan to Goals and Objectives
- ✅ **Suggested Values** - Helper functions to suggest next available letters/numbers
- ✅ **AJAX Suggestions** - JavaScript can request suggested values for auto-completion

### **To Enable** (optional):
1. Edit `work-plan-manager.php`
2. Find this line: `// require_once WPM_PLUGIN_PATH . 'includes/acf-behaviors.php';`  
3. Uncomment it by removing the `//`
4. Save the file

### **When You Don't Need It**:
- Your ACF setup already handles validation
- You prefer to manage field behavior through your own code
- You want to keep the plugin as minimal as possible

## Changelog

### Version 1.1.0
**Updates:**
- ✅ **Eliminated Grant Quarters**: Removed all references to grant quarter sub-taxonomy. Only grant year taxonomy is now used.
- ✅ **Field Structure Changes**: Moved `timeline_description` field from Work Plan Goals to Work Plan Objectives for better organization.
- ✅ **New Field Added**: Added `measurable_outcomes` textarea field to Work Plan Objectives for enhanced tracking.
- ✅ **Duplicate Validation**: Added comprehensive validation to prevent duplicate goal letters, objective numbers, and output letters when reordering items.

**Fixes:**
- ✅ **Fixed Metadata Display**: Grant Year, Group, and Internal Status now properly appear in Work Plan form fields and tabular preview section.
- ✅ **Form Field Population**: Fixed issue where taxonomy and ACF field values weren't being loaded into forms when editing existing work plans.
- ✅ **Preview Table Structure**: Updated preview table headers and data structure to reflect new field organization.

### Version 1.0.0
- Initial release
- Basic Work Plan, Goal, and Objective management
- ACF integration
- PublishPress Permissions integration
- Export functionality (Excel/CSV)
- Responsive design
- Real-time preview

## License

This plugin is released under the GPL v2 or later license.

## Credits

- Built with WordPress best practices
- Utilizes Advanced Custom Fields for enhanced functionality
- Integrates with PublishPress for advanced permissions
- Uses WordPress React components for preview functionality