<?php
/**
 * Plugin Name: Work Plan Manager
 * Description: A plugin to manage Work Plans, Goals, and Objectives with a streamlined interface
 * Version: 1.0.3
 * Author: KC Web Programmers
 * Text Domain: work-plan-manager
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('WPM_PLUGIN_URL', plugin_dir_url(__FILE__));
define('WPM_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('WPM_VERSION', '1.0.0');

class WorkPlanManager {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        add_action('wp_ajax_save_workplan', array($this, 'ajax_save_workplan'));
        add_action('wp_ajax_save_goal', array($this, 'ajax_save_goal'));
        add_action('wp_ajax_save_objective', array($this, 'ajax_save_objective'));
        add_action('wp_ajax_get_workplan_data', array($this, 'ajax_get_workplan_data'));
        add_action('wp_ajax_delete_goal', array($this, 'ajax_delete_goal'));
        add_action('wp_ajax_delete_objective', array($this, 'ajax_delete_objective'));
        
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        
        // Include required files
        $this->include_files();
    }
    
    /**
     * Include required files
     */
    private function include_files() {
        require_once WPM_PLUGIN_PATH . 'includes/installation.php';
        require_once WPM_PLUGIN_PATH . 'includes/utility-functions.php';
        require_once WPM_PLUGIN_PATH . 'includes/export-handler.php';
        
        // Optional: Include ACF field behaviors for enhanced validation and automation
        // Uncomment the line below if you want additional ACF field enhancements
        // require_once WPM_PLUGIN_PATH . 'includes/acf-behaviors.php';
    }
    
    public function init() {
        $this->setup_capabilities();
    }
    
    public function setup_capabilities() {
        // Add custom capability for the plugin
        $role = get_role('administrator');
        if ($role) {
            $role->add_cap('manage_workplans');
            $role->add_cap('edit_workplans');
            $role->add_cap('edit_others_workplans');
            $role->add_cap('publish_workplans');
            $role->add_cap('read_private_workplans');
            $role->add_cap('delete_workplans');
            $role->add_cap('delete_private_workplans');
            $role->add_cap('delete_published_workplans');
            $role->add_cap('delete_others_workplans');
            $role->add_cap('edit_private_workplans');
            $role->add_cap('edit_published_workplans');
        }
    }
    
    public function add_admin_menu() {
        add_menu_page(
            __('Work Plan Manager', 'work-plan-manager'),
            __('Work Plans', 'work-plan-manager'),
            'manage_workplans',
            'work-plan-manager',
            array($this, 'admin_page'),
            'dashicons-list-view',
            30
        );
    }
    
    public function enqueue_admin_scripts($hook) {
        if ($hook !== 'toplevel_page_work-plan-manager') {
            return;
        }
        
        // Add error logging for debugging
        wp_enqueue_script(
            'work-plan-manager-js',
            WPM_PLUGIN_URL . 'js/work-plan-manager.js',
            array('wp-element', 'wp-components', 'wp-api-fetch'),
            WPM_VERSION,
            true
        );
        
        wp_enqueue_style(
            'work-plan-manager-css',
            WPM_PLUGIN_URL . 'css/work-plan-manager.css',
            array(),
            WPM_VERSION
        );
        
        wp_localize_script('work-plan-manager-js', 'wpm_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wpm_nonce'),
            'current_user_id' => get_current_user_id(),
            'debug' => defined('WP_DEBUG') && WP_DEBUG
        ));
        
        // Add inline script to catch and log JavaScript errors
        wp_add_inline_script('work-plan-manager-js', '
            window.addEventListener("error", function(e) {
                if (window.wpm_ajax && window.wpm_ajax.debug) {
                    console.log("WPM JavaScript Error:", e.error, e.filename, e.lineno);
                }
            });
            
            window.addEventListener("unhandledrejection", function(e) {
                if (window.wpm_ajax && window.wpm_ajax.debug) {
                    console.log("WPM Promise Rejection:", e.reason);
                }
            });
        ', 'before');
    }
    
    public function admin_page() {
        if (!current_user_can('manage_workplans')) {
            wp_die(__('You do not have sufficient permissions to access this page.'));
        }
        
        include WPM_PLUGIN_PATH . 'includes/admin-page.php';
    }
    
    // AJAX Handlers
    public function ajax_save_workplan() {
        check_ajax_referer('wpm_nonce', 'nonce');
        
        if (!current_user_can('edit_workplans')) {
            wp_send_json_error('Insufficient permissions to edit workplans');
        }
        
        $workplan_id = intval($_POST['workplan_id']);
        $title = sanitize_text_field($_POST['title']);
        $grant_year = sanitize_text_field($_POST['grant_year']);
        $group = sanitize_text_field($_POST['group']);
        $internal_status = sanitize_text_field($_POST['internal_status']);
        
        // Additional permission check for existing workplans
        if ($workplan_id > 0 && !wpm_user_can_edit_workplan($workplan_id)) {
            wp_send_json_error('Insufficient permissions to edit this workplan');
        }
        
        $post_data = array(
            'post_title' => $title,
            'post_type' => 'workplan',
            'post_status' => 'publish',
            'post_author' => get_current_user_id(),
        );
        
        if ($workplan_id > 0) {
            $post_data['ID'] = $workplan_id;
            $result = wp_update_post($post_data);
        } else {
            $result = wp_insert_post($post_data);
        }
        
        if ($result && !is_wp_error($result)) {
            // Set taxonomies
            if ($group) {
                wp_set_post_terms($result, array($group), 'group');
            }
            
            if ($grant_year) {
                wp_set_post_terms($result, array($grant_year), 'grant-year');
            }
            
            // Set ACF fields
            if (function_exists('update_field')) {
                update_field('internal_status', $internal_status, $result);
            }
            
            wp_send_json_success(array('workplan_id' => $result));
        } else {
            wp_send_json_error('Failed to save work plan');
        }
    }
    
    public function ajax_save_goal() {
        check_ajax_referer('wpm_nonce', 'nonce');
        
        if (!current_user_can('edit_workplans')) {
            wp_send_json_error('Insufficient permissions to edit workplans');
        }
        
        $goal_id = intval($_POST['goal_id']);
        $workplan_id = intval($_POST['workplan_id']);
        $title = sanitize_text_field($_POST['title']);
        $goal_letter = sanitize_text_field($_POST['goal_letter']);
        $goal_description = sanitize_textarea_field($_POST['goal_description']);
        
        // Check permission for parent workplan
        if (!wpm_user_can_edit_workplan($workplan_id)) {
            wp_send_json_error('Insufficient permissions to edit this workplan');
        }
        
        $post_data = array(
            'post_title' => $title,
            'post_type' => 'workplan-goal',
            'post_status' => 'publish',
            'post_author' => get_current_user_id(),
            'post_parent' => $workplan_id,
        );
        
        if ($goal_id > 0) {
            $post_data['ID'] = $goal_id;
            $result = wp_update_post($post_data);
        } else {
            $result = wp_insert_post($post_data);
        }
        
        if ($result && !is_wp_error($result)) {
            // Copy group taxonomy from parent workplan
            $group_terms = wp_get_post_terms($workplan_id, 'group', array('fields' => 'slugs'));
            if (!empty($group_terms)) {
                wp_set_post_terms($result, $group_terms, 'group');
            }
            
            // Set ACF fields
            if (function_exists('update_field')) {
                update_field('goal_letter', $goal_letter, $result);
                update_field('goal_description', $goal_description, $result);
                
                // Update the parent workplan's related_work_plan_goals field
                $existing_goals = get_field('related_work_plan_goals', $workplan_id) ?: array();
                if (!in_array($result, $existing_goals)) {
                    $existing_goals[] = $result;
                    update_field('related_work_plan_goals', $existing_goals, $workplan_id);
                }
            }
            
            wp_send_json_success(array('goal_id' => $result));
        } else {
            wp_send_json_error('Failed to save goal');
        }
    }
    
    public function ajax_save_objective() {
        check_ajax_referer('wpm_nonce', 'nonce');
        
        if (!current_user_can('edit_workplans')) {
            wp_send_json_error('Insufficient permissions to edit workplans');
        }
        
        $objective_id = intval($_POST['objective_id']);
        $goal_id = intval($_POST['goal_id']);
        $workplan_id = intval($_POST['workplan_id']);
        $title = sanitize_text_field($_POST['title']);
        $objective_number = intval($_POST['objective_number']);
        $objective_description = sanitize_textarea_field($_POST['objective_description']);
        $timeline_description = sanitize_text_field($_POST['timeline_description']);
        $measureable_outcomes = sanitize_textarea_field($_POST['measureable_outcomes']);
        $outputs = json_decode(stripslashes($_POST['outputs']), true);
        
        // Check permission for parent workplan
        if (!wpm_user_can_edit_workplan($workplan_id)) {
            wp_send_json_error('Insufficient permissions to edit this workplan');
        }
        
        $post_data = array(
            'post_title' => $title,
            'post_type' => 'workplan-objective',
            'post_status' => 'publish',
            'post_author' => get_current_user_id(),
            'post_parent' => $goal_id,
        );
        
        if ($objective_id > 0) {
            $post_data['ID'] = $objective_id;
            $result = wp_update_post($post_data);
        } else {
            $result = wp_insert_post($post_data);
        }
        
        if ($result && !is_wp_error($result)) {
            // Copy group taxonomy from parent workplan
            $group_terms = wp_get_post_terms($workplan_id, 'group', array('fields' => 'slugs'));
            if (!empty($group_terms)) {
                wp_set_post_terms($result, $group_terms, 'group');
            }
            
            // Set ACF fields
            if (function_exists('update_field')) {
                update_field('objective_number', $objective_number, $result);
                update_field('objective_description', $objective_description, $result);
                update_field('timeline_description', $timeline_description, $result);
                update_field('measureable_outcomes', $measureable_outcomes, $result);
                update_field('objective_outputs', $outputs, $result);
                
                // Update the parent goal's work_plan_objectives field
                $existing_objectives = get_field('work_plan_objectives', $goal_id) ?: array();
                if (!in_array($result, $existing_objectives)) {
                    $existing_objectives[] = $result;
                    update_field('work_plan_objectives', $existing_objectives, $goal_id);
                }
            }
            
            wp_send_json_success(array('objective_id' => $result));
        } else {
            wp_send_json_error('Failed to save objective');
        }
    }
    
    public function ajax_get_workplan_data() {
        check_ajax_referer('wpm_nonce', 'nonce');
        
        if (!current_user_can('edit_workplans')) {
            wp_send_json_error('Insufficient permissions to view workplans');
        }
        
        $workplan_id = intval($_POST['workplan_id']);
        $workplan = get_post($workplan_id);
        
        if (!$workplan) {
            wp_send_json_error('Work plan not found');
        }
        
        // Check if user can edit this specific workplan
        if (!wpm_user_can_edit_workplan($workplan_id)) {
            wp_send_json_error('Insufficient permissions to edit this workplan');
        }
        
        // Get workplan data
        $workplan_data = array(
            'id' => $workplan->ID,
            'title' => $workplan->post_title,
            'author' => get_the_author_meta('display_name', $workplan->post_author),
            'date' => $workplan->post_date,
            'internal_status' => get_field('internal_status', $workplan->ID),
            'group' => wp_get_post_terms($workplan->ID, 'group', array('fields' => 'names')),
            'grant_year' => wp_get_post_terms($workplan->ID, 'grant-year', array('fields' => 'names')),
        );
        
        // Get goals using the relationship field
        $goal_ids = get_field('related_work_plan_goals', $workplan_id) ?: array();
        
        $goals_data = array();
        foreach ($goal_ids as $goal_id) {
            $goal = get_post($goal_id);
            if (!$goal) continue;
            
            $goal_data = array(
                'id' => $goal->ID,
                'title' => $goal->post_title,
                'goal_letter' => get_field('goal_letter', $goal->ID),
                'goal_description' => get_field('goal_description', $goal->ID),
            );
            
            // Get objectives for this goal using the relationship field
            $objective_ids = get_field('work_plan_objectives', $goal->ID) ?: array();
            
            $objectives_data = array();
            foreach ($objective_ids as $objective_id) {
                $objective = get_post($objective_id);
                if (!$objective) continue;
                
                $objectives_data[] = array(
                    'id' => $objective->ID,
                    'title' => $objective->post_title,
                    'objective_number' => get_field('objective_number', $objective->ID),
                    'objective_description' => get_field('objective_description', $objective->ID),
                    'timeline_description' => get_field('timeline_description', $objective->ID),
                    'measureable_outcomes' => get_field('measureable_outcomes', $objective->ID),
                    'outputs' => get_field('objective_outputs', $objective->ID) ?: array(),
                );
            }
            
            $goal_data['objectives'] = $objectives_data;
            $goals_data[] = $goal_data;
        }
        
        $workplan_data['goals'] = $goals_data;
        
        wp_send_json_success($workplan_data);
    }
    
    public function ajax_delete_goal() {
        check_ajax_referer('wpm_nonce', 'nonce');
        
        if (!current_user_can('delete_workplans')) {
            wp_send_json_error('Insufficient permissions to delete goals');
        }
        
        $goal_id = intval($_POST['goal_id']);
        
        // Get the parent workplan to check permissions and update its relationship field
        $workplan_id = 0;
        $all_workplans = get_posts(array(
            'post_type' => 'workplan',
            'posts_per_page' => -1,
            'post_status' => 'publish'
        ));
        
        foreach ($all_workplans as $workplan) {
            $related_goals = get_field('related_work_plan_goals', $workplan->ID) ?: array();
            if (in_array($goal_id, $related_goals)) {
                $workplan_id = $workplan->ID;
                break;
            }
        }
        
        // Check permission for parent workplan
        if ($workplan_id && !wpm_user_can_edit_workplan($workplan_id)) {
            wp_send_json_error('Insufficient permissions to edit this workplan');
        }
        
        // Delete associated objectives first and update goal's relationship field
        $objective_ids = get_field('work_plan_objectives', $goal_id) ?: array();
        foreach ($objective_ids as $objective_id) {
            wp_delete_post($objective_id, true);
        }
        
        // Update parent workplan's relationship field
        if ($workplan_id && function_exists('update_field')) {
            $related_goals = get_field('related_work_plan_goals', $workplan_id) ?: array();
            $related_goals = array_diff($related_goals, array($goal_id));
            update_field('related_work_plan_goals', array_values($related_goals), $workplan_id);
        }
        
        // Delete the goal
        $result = wp_delete_post($goal_id, true);
        
        if ($result) {
            wp_send_json_success();
        } else {
            wp_send_json_error('Failed to delete goal');
        }
    }
    
    public function ajax_delete_objective() {
        check_ajax_referer('wpm_nonce', 'nonce');
        
        if (!current_user_can('delete_workplans')) {
            wp_send_json_error('Insufficient permissions to delete objectives');
        }
        
        $objective_id = intval($_POST['objective_id']);
        
        // Find the parent goal and workplan to check permissions and update relationship fields
        $goal_id = 0;
        $workplan_id = 0;
        
        $all_goals = get_posts(array(
            'post_type' => 'workplan-goal',
            'posts_per_page' => -1,
            'post_status' => 'publish'
        ));
        
        foreach ($all_goals as $goal) {
            $related_objectives = get_field('work_plan_objectives', $goal->ID) ?: array();
            if (in_array($objective_id, $related_objectives)) {
                $goal_id = $goal->ID;
                break;
            }
        }
        
        // Find parent workplan through the goal
        if ($goal_id) {
            $all_workplans = get_posts(array(
                'post_type' => 'workplan',
                'posts_per_page' => -1,
                'post_status' => 'publish'
            ));
            
            foreach ($all_workplans as $workplan) {
                $related_goals = get_field('related_work_plan_goals', $workplan->ID) ?: array();
                if (in_array($goal_id, $related_goals)) {
                    $workplan_id = $workplan->ID;
                    break;
                }
            }
        }
        
        // Check permission for parent workplan
        if ($workplan_id && !wpm_user_can_edit_workplan($workplan_id)) {
            wp_send_json_error('Insufficient permissions to edit this workplan');
        }
        
        // Update parent goal's relationship field
        if ($goal_id && function_exists('update_field')) {
            $related_objectives = get_field('work_plan_objectives', $goal_id) ?: array();
            $related_objectives = array_diff($related_objectives, array($objective_id));
            update_field('work_plan_objectives', array_values($related_objectives), $goal_id);
        }
        
        $result = wp_delete_post($objective_id, true);
        
        if ($result) {
            wp_send_json_success();
        } else {
            wp_send_json_error('Failed to delete objective');
        }
    }
    
    public function activate() {
        // Check basic requirements before activation
        if (!function_exists('get_field')) {
            deactivate_plugins(plugin_basename(__FILE__));
            wp_die(
                __('Work Plan Manager requires Advanced Custom Fields (ACF) to be installed and activated.', 'work-plan-manager'),
                __('Plugin Activation Error', 'work-plan-manager'),
                array('back_link' => true)
            );
        }
        
        try {
            $this->setup_capabilities();
            flush_rewrite_rules();
            
            // Set activation flag
            update_option('wpm_activated', true);
            update_option('wpm_activation_time', current_time('timestamp'));
            
        } catch (Exception $e) {
            // Log the error if debug is enabled
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[Work Plan Manager] Activation error: ' . $e->getMessage());
            }
            
            deactivate_plugins(plugin_basename(__FILE__));
            wp_die(
                __('Work Plan Manager could not be activated due to an error. Please check your error logs.', 'work-plan-manager'),
                __('Plugin Activation Error', 'work-plan-manager'),
                array('back_link' => true)
            );
        }
    }
    
    public function deactivate() {
        flush_rewrite_rules();
    }
    
    // Helper method to get user groups
    public function get_user_groups($user_id = null) {
        if (!$user_id) {
            $user_id = get_current_user_id();
        }
        
        if (function_exists('pp_get_groups_for_user')) {
            return pp_get_groups_for_user($user_id);
        }
        
        return array();
    }
    
    // Helper method to get accessible group terms
    public function get_accessible_groups($user_id = null) {
        if (!$user_id) {
            $user_id = get_current_user_id();
        }
        
        // Administrators can access all groups
        if (user_can($user_id, 'edit_others_workplans')) {
            return array(); // Empty array means no filtering - show all
        }
        
        $user_groups = $this->get_user_groups($user_id);
        $accessible_groups = array();
        
        if (!empty($user_groups)) {
            foreach ($user_groups as $user_group) {
                // Map metagroup_id to actual group terms
                $group_mappings = array(
                    'great_lakes_editor' => 'Great Lakes ATTC',
                    'mid_america_editor' => 'Mid-America ATTC',
                    'central_east_editor' => 'Central East ATTC',
                );
                
                if (isset($group_mappings[$user_group->metagroup_id])) {
                    $accessible_groups[] = $group_mappings[$user_group->metagroup_id];
                }
            }
        }
        
        return $accessible_groups;
    }
}

// Initialize the plugin
new WorkPlanManager();