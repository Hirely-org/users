// constants/messageTypes.js
const MessageTypes = {
    // User service events
    DELETE_USER_START: 'delete_user_start',
    DELETE_USER_SUCCESS: 'delete_user_success',
    DELETE_USER_FAILED: 'delete_user_failed',
    
    // Job Application service events
    JOB_APPLICATIONS_DELETED: 'job_applications_deleted',
    JOB_APPLICATIONS_DELETION_FAILED: 'job_applications_deletion_failed',
    
    // Rollback events
    ROLLBACK_DELETE_USER: 'rollback_delete_user',
    ROLLBACK_JOB_APPLICATIONS: 'rollback_job_applications',

    // Final saga status
    SAGA_COMPLETED: 'saga_completed',
    SAGA_FAILED: 'saga_failed'
};

module.exports = MessageTypes;