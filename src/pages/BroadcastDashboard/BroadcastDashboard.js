import React, { useState, useMemo } from 'react';
import {
  FaEnvelope,
  FaPaperPlane,
  FaSpinner,
  FaTimes,
  FaExclamationTriangle,
  FaUserCheck,
  FaUserMinus,
  FaInfoCircle,
  FaTerminal
} from 'react-icons/fa';
import { email as emailApi } from '../../apiClient';
import styles from './BroadcastDashboard.module.css';

export default function BroadcastDashboard({ attendees = [] }) {
  const [activeReviewBatch, setActiveReviewBatch] = useState(null); // 'agreed' | 'not_agreed' | null
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailLogs, setEmailLogs] = useState({ success: 0, failed: 0, currentAction: '' });
  const [liveTerminalLogs, setLiveTerminalLogs] = useState(['[SYSTEM]: Live production transmission lines ready. Dual-template engine active.']);
  const [failedUsers, setFailedUsers] = useState([]);

  const writeToTerminal = (text) => {
    const timeMarker = new Date().toLocaleTimeString();
    setLiveTerminalLogs(prev => [`[${timeMarker}] ${text}`, ...prev.slice(0, 40)]);
  };

  // Calculate live breakdown summaries 
  const stats = useMemo(() => {
    return attendees.reduce((acc, current) => {
      if (current.is_selected === 1) acc.selected += 1;
      else if (current.is_selected === 2) acc.notSelected += 1;
      else acc.pending += 1;
      return acc;
    }, { selected: 0, notSelected: 0, pending: 0, total: attendees.length });
  }, [attendees]);

  // Extract selected batch array
  const previewBatchUsers = useMemo(() => {
    if (!activeReviewBatch) return [];
    const statusTarget = activeReviewBatch === 'agreed' ? 1 : 2;
    return attendees.filter(user => user.is_selected === statusTarget);
  }, [attendees, activeReviewBatch]);

  // Execute live production mass delivery pipeline with template branching split
  const executeFinalizedBroadcast = async (usersToSend = null) => {
    const batch = usersToSend || previewBatchUsers;
    if (batch.length === 0) return;

    setIsSendingEmails(true);
    setFailedUsers([]);
    const targetTemplate = activeReviewBatch === 'agreed' ? 'ACCEPTANCE_CARD' : 'REJECTION_MINIMAL';

    writeToTerminal(`🚀 INITIATING ${targetTemplate} TEMPLATE PIPELINE FOR ${batch.length} TARGET NODES.`);
    setEmailLogs({ success: 0, failed: 0, currentAction: `Initializing staging environment for ${batch.length} records...` });

    let successCount = 0;
    const localFailed = [];

    for (let i = 0; i < batch.length; i++) {
      const targetUser = batch[i];
      const targetEmail = targetUser.email || targetUser.email_address || targetUser.parent_email;

      if (!targetEmail) {
        localFailed.push({ ...targetUser, _failReason: 'No email address on record' });
        writeToTerminal(`⚠️ [BYPASSED]: "${targetUser.name || 'Unknown'}" contains no valid email destination parameter.`);
        setEmailLogs({ success: successCount, failed: localFailed.length, currentAction: `(${i + 1}/${batch.length}) Skipped — no email for ${targetUser.name || 'Attendee'}` });
        continue;
      }

      const currentActionText = `(${i + 1}/${batch.length}) Dispatching ${targetTemplate} to: ${targetUser.name || 'Attendee'}`;
      setEmailLogs({ success: successCount, failed: localFailed.length, currentAction: currentActionText });
      writeToTerminal(`[TRANSMITTING]: Slot ${i + 1}/${batch.length} [${targetTemplate}] -> ${targetEmail}`);

      try {
        await emailApi.sendSelection({
          email: targetEmail,
          name: targetUser.name,
          templateType: targetTemplate,
        });
        successCount++;
        writeToTerminal(`✅ [DELIVERED]: Successfully sent to ${targetEmail}`);
      } catch (error) {
        const reason = error.message || 'Unknown error';
        localFailed.push({ ...targetUser, _failReason: reason });
        writeToTerminal(`❌ [PIPE EXCEPTION]: Delivery failure on ${targetEmail} -> ${reason}`);
      }

      setEmailLogs({ success: successCount, failed: localFailed.length, currentAction: currentActionText });
    }

    const finalSummaryLog = `Pipeline concluded. Delivered: ${successCount}. Failed: ${localFailed.length}.`;
    setEmailLogs({ success: successCount, failed: localFailed.length, currentAction: finalSummaryLog });
    writeToTerminal(`🏁 LIVE BATCH RUNTIME CONCLUDED: ${finalSummaryLog}`);
    setFailedUsers(localFailed);
    setIsSendingEmails(false);

    if (localFailed.length === 0) {
      setTimeout(() => setActiveReviewBatch(null), 2000);
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Title block */}
      <div className={styles.dashHeader}>
        <div className={styles.titleInfo}>
          <FaEnvelope className={styles.dashHeaderIcon} />
          <div>
            <h2>Bulk Email</h2>
          </div>
        </div>
        <div className={styles.liveServerBadge}>
          <span className={styles.pulseDot}></span>
          <span>TZ</span>
        </div>
      </div>

      {/* Operational Breakdown Cards */}
      <div className={styles.metricsGrid}>
        <div className={`${styles.metricCard} ${styles.selectedBorder}`}>
          <div className={styles.metricLayout}>
            <h4>Selected</h4>
            <span className={styles.metricNum}>{stats.selected}</span>
            <p>Attendees assigned confirmation</p>
          </div>
          <FaUserCheck className={styles.cardWatermark} />
        </div>

        <div className={`${styles.metricCard} ${styles.rejectedBorder}`}>
          <div className={styles.metricLayout}>
            <h4>Not Selected </h4>
            <span className={styles.metricNum}>{stats.notSelected}</span>
            <p>Attendees assigned rejection</p>
          </div>
          <FaUserMinus className={styles.cardWatermark} />
        </div>

        <div className={`${styles.metricCard} ${styles.pendingBorder}`}>
          <div className={styles.metricLayout}>
            <h4> Pending</h4>
            <span className={styles.metricNum}>{stats.pending}</span>
            <p>Records awaiting active decision</p>
          </div>
          <FaInfoCircle className={styles.cardWatermark} />
        </div>
      </div>

      {/* Control Actions */}
      <div className={styles.actionLayoutBox}>
        <h3>Available</h3>
        <p className={styles.disclaimerText}>
        </p>

        <div className={styles.pipelineRow}>
          <div className={styles.pipelineCard}>
            <div className={styles.pipelineMeta}>
              <h5>1. Selection Template</h5>
            </div>
            <button 
              onClick={() => { setActiveReviewBatch('agreed'); setFailedUsers([]); }}
              disabled={stats.selected === 0 || isSendingEmails}
              className={`${styles.launchBtn} ${styles.btnSelectColor}`}
            >
              Review Batch ({stats.selected})
            </button>
          </div>

          <div className={styles.pipelineCard}>
            <div className={styles.pipelineMeta}>
              <h5>2. Non-Acceptance Template</h5>
            </div>
            <button 
              onClick={() => { setActiveReviewBatch('not_agreed'); setFailedUsers([]); }}
              disabled={stats.notSelected === 0 || isSendingEmails}
              className={`${styles.launchBtn} ${styles.btnRejectColor}`}
            >
              Review Batch ({stats.notSelected})
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Live Server Telemetry Streams */}
      <div className={styles.terminalContainerFrame}>
        <div className={styles.terminalTopBar}>
          <div className={styles.terminalWindowActions}>
            <span className={`${styles.termDot} ${styles.termRed}`}></span>
            <span className={`${styles.termDot} ${styles.termYellow}`}></span>
            <span className={`${styles.termDot} ${styles.termGreen}`}></span>
          </div>
          <div className={styles.terminalTitleTab}>
            <FaTerminal style={{ fontSize: '11px' }} />
            <span>mtrc-2026 serverless function deployment telemetry</span>
          </div>
        </div>
        <div className={styles.terminalOutputContentLog}>
          {liveTerminalLogs.map((log, index) => (
            <div key={index} className={styles.terminalOutputLine}>{log}</div>
          ))}
        </div>
      </div>

      {/* Interactive Verification Overlay Drawer */}
      {activeReviewBatch && (
        <div className={styles.drawerOverlay}>
          <div className={styles.drawerPaper}>
            <div className={styles.drawerHeader}>
              <h3>
                Confirm Broadcast Checklist (
                {activeReviewBatch === 'agreed' ? 'Selected Pool' : 'Rejected Pool'}
                )
              </h3>
              {!isSendingEmails && (
                <button className={styles.closeBtn} onClick={() => setActiveReviewBatch(null)}>
                  <FaTimes />
                </button>
              )}
            </div>

            {isSendingEmails ? (
              <div className={styles.drawerProcessing}>
                <FaSpinner className={styles.spinIcon} />
                <h4>Processing Live Email Dispatch Queue</h4>
                <p className={styles.processingLogText}>{emailLogs.currentAction}</p>
                <div className={styles.modalProgressCounter}>
                  <span className={styles.txtSuccess}>Delivered: <strong>{emailLogs.success}</strong></span>
                  <span className={styles.txtFailed}>Failed: <strong>{emailLogs.failed}</strong></span>
                </div>
              </div>
            ) : failedUsers.length > 0 ? (
              <>
                <div className={styles.drawerFailedAlert}>
                  <FaExclamationTriangle style={{ fontSize: '18px', flexShrink: 0 }} />
                  <p>
                    <strong>{emailLogs.success}</strong> sent successfully.{' '}
                    <strong>{failedUsers.length}</strong> failed — listed below. Successful deliveries have been removed.
                  </p>
                </div>

                <div className={styles.drawerScrollList}>
                  {failedUsers.map(user => {
                    const extractedEmail = user.email || user.email_address || user.parent_email;
                    return (
                      <div key={user.id || extractedEmail} className={styles.drawerUserRowFailed}>
                        <div className={styles.drawerUserRowLeft}>
                          <span className={styles.drawerUserName}>{user.name || 'Anonymous User'}</span>
                          <span className={styles.drawerUserEmail}>{extractedEmail || 'No email on record'}</span>
                        </div>
                        <span className={styles.failReasonTag}>{user._failReason}</span>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.drawerActionFooter}>
                  <button className={styles.cancelBtn} onClick={() => { setActiveReviewBatch(null); setFailedUsers([]); }}>
                    Close
                  </button>
                  <button className={styles.confirmSendBtn} onClick={() => executeFinalizedBroadcast(failedUsers)}>
                    <FaPaperPlane style={{ marginRight: '8px' }} /> Retry Failed ({failedUsers.length})
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.drawerWarningAlert}>
                  <FaExclamationTriangle style={{ fontSize: '18px', flexShrink: 0 }} />
                  <p>
                    You are reviewing a manual batch snapshot of <strong>{previewBatchUsers.length} profiles</strong>.{' '}
                    Target template: <strong>{activeReviewBatch === 'agreed' ? 'ACCEPTANCE_CARD' : 'REJECTION_MINIMAL'}</strong>.
                  </p>
                </div>

                <div className={styles.drawerScrollList}>
                  {previewBatchUsers.map(user => {
                    const extractedEmail = user.email || user.email_address || user.parent_email;
                    return (
                      <div key={user.id || user.email} className={styles.drawerUserRow}>
                        <span className={styles.drawerUserName}>{user.name || 'Anonymous User'}</span>
                        <span className={`${styles.drawerUserEmail} ${!extractedEmail ? styles.emailMissingWarning : ''}`}>
                          {extractedEmail || '⚠️ No email on record (will be skipped)'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.drawerActionFooter}>
                  <button className={styles.cancelBtn} onClick={() => setActiveReviewBatch(null)}>
                    Go Back &amp; Cancel
                  </button>
                  <button className={styles.confirmSendBtn} onClick={() => executeFinalizedBroadcast()}>
                    <FaPaperPlane style={{ marginRight: '8px' }} /> Dispatch Emails to ({previewBatchUsers.length}) Users Now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
