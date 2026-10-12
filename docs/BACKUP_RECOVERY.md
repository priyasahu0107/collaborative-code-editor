# Database Backup and Recovery Guide

This document outlines the backup and recovery procedures for the Collaborative Code Editor's MongoDB database.

## Overview

The application uses MongoDB Atlas for data persistence. All critical data including users, projects, files, chat messages, and collaboration state is stored in MongoDB.

## Backup Strategy

### MongoDB Atlas Automated Backups

MongoDB Atlas provides automated backup capabilities that are enabled by default for all clusters.

#### Backup Schedule
- **Frequency**: Continuous backup with point-in-time recovery
- **Retention**: 7 days for M10+ clusters, 30 days for M20+ clusters
- **Snapshot Frequency**: Every 6 hours

#### Enabling Backups
1. Navigate to your MongoDB Atlas cluster
2. Go to the "Backup" tab
3. Ensure "Continuous Cloud Backups" is enabled
4. Configure backup schedule if needed

### Manual Backups

#### Creating a Manual Snapshot

1. **Via Atlas UI**:
   - Navigate to your cluster
   - Click "Backup" tab
   - Click "Take Snapshot"
   - Provide a descriptive name
   - Click "Take Snapshot"

2. **Via Atlas CLI**:
   ```bash
   atlas backups snapshots create <clusterName> \
     --desc "Manual backup before deployment" \
     --retention 7
   ```

3. **Via mongodump** (for local development):
   ```bash
   mongodump --uri="mongodb+srv://<username>:<password>@<cluster-url>/<database>" \
     --out=./backup-$(date +%Y%m%d-%H%M%S)
   ```

## Recovery Procedures

### Point-in-Time Recovery

MongoDB Atlas supports point-in-time recovery to any second within the backup retention period.

#### Steps:
1. Navigate to your cluster in Atlas
2. Go to the "Backup" tab
3. Click "Restore"
4. Select "Point in Time"
5. Choose the exact timestamp
6. Select restore destination (new cluster or existing cluster)
7. Confirm and initiate restore

### Restore from Snapshot

#### Steps:
1. Navigate to your cluster in Atlas
2. Go to the "Backup" tab
3. Find the desired snapshot
4. Click "Restore"
5. Select restore destination
6. Confirm and initiate restore

### Restore via mongorestore

For local development or manual restores:

```bash
mongorestore --uri="mongodb+srv://<username>:<password>@<cluster-url>/<database>" \
  ./backup-directory
```

## Backup Verification

### Automated Verification Script

Create a verification script to ensure backups are restorable:

```typescript
// scripts/verifyBackup.ts
import { MongoClient } from 'mongodb';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function verifyBackup() {
  const backupPath = process.env.BACKUP_PATH;
  const testDbUri = process.env.TEST_DB_URI;
  
  if (!backupPath || !testDbUri) {
    throw new Error('BACKUP_PATH and TEST_DB_URI environment variables required');
  }

  try {
    // Restore to test database
    await execAsync(`mongorestore --uri="${testDbUri}" ${backupPath}`);
    
    // Connect and verify data
    const client = new MongoClient(testDbUri);
    await client.connect();
    
    const db = client.db();
    
    // Verify critical collections exist and have data
    const usersCount = await db.collection('users').countDocuments();
    const projectsCount = await db.collection('projects').countDocuments();
    
    console.log('Backup verification successful:');
    console.log(`- Users: ${usersCount}`);
    console.log(`- Projects: ${projectsCount}`);
    
    await client.close();
    
    // Clean up test database
    await execAsync(`mongosh "${testDbUri}" --eval "db.dropDatabase()"`);
    
    console.log('✅ Backup verification passed');
  } catch (error) {
    console.error('❌ Backup verification failed:', error);
    process.exit(1);
  }
}

verifyBackup();
```

### Running Verification

```bash
# Set environment variables
export BACKUP_PATH="./latest-backup"
export TEST_DB_URI="mongodb://localhost:27017/backup-verification"

# Run verification
npx tsx scripts/verifyBackup.ts
```

## Backup Monitoring

### Atlas Backup Monitoring

MongoDB Atlas provides monitoring for backup jobs:

1. Navigate to your cluster
2. Go to "Backup" tab
3. Check backup job status
4. Review backup size and duration
5. Set up alerts for backup failures

### Custom Monitoring

Create a monitoring script to check backup status:

```typescript
// scripts/checkBackupStatus.ts
import { MongoClient } from 'mongodb';

async function checkBackupStatus() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri!);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Check database stats
    const stats = await db.stats();
    
    console.log('Database Status:');
    console.log(`- Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Collections: ${stats.collections}`);
    console.log(`- Documents: ${stats.objects}`);
    
    // Check critical collections
    const collections = ['users', 'projects', 'files', 'messages'];
    for (const coll of collections) {
      const count = await db.collection(coll).countDocuments();
      console.log(`- ${coll}: ${count} documents`);
    }
    
  } finally {
    await client.close();
  }
}

checkBackupStatus();
```

## Disaster Recovery Plan

### Recovery Time Objective (RTO)
- **Target**: 1 hour
- **Actual**: Depends on backup size and network speed

### Recovery Point Objective (RPO)
- **Target**: 5 minutes
- **Actual**: Continuous backup with point-in-time recovery

### Disaster Recovery Steps

1. **Assess the Situation**
   - Determine the scope of data loss
   - Identify the last known good state
   - Document the incident

2. **Select Recovery Point**
   - Choose the appropriate backup/snapshot
   - Verify backup integrity
   - Plan the restore process

3. **Execute Recovery**
   - Restore to a new cluster (recommended)
   - Verify data integrity
   - Test application functionality

4. **Switch Traffic**
   - Update connection strings
   - Redirect application traffic
   - Monitor for issues

5. **Post-Recovery**
   - Verify all data is present
   - Test all critical features
   - Monitor performance
   - Document lessons learned

## Best Practices

### DO:
- ✅ Enable automated backups in Atlas
- ✅ Test backup restoration regularly (monthly)
- ✅ Monitor backup job success/failure
- ✅ Keep multiple backup snapshots
- ✅ Document recovery procedures
- ✅ Practice disaster recovery drills
- ✅ Use point-in-time recovery for precise restores
- ✅ Verify data integrity after restoration

### DON'T:
- ❌ Rely solely on local backups
- ❌ Skip backup verification
- ❌ Store backups in the same region as primary
- ❌ Forget to test restore procedures
- ❌ Ignore backup failure alerts
- ❌ Delete old backups without verification
- ❌ Assume backups work without testing

## Environment-Specific Procedures

### Development

```bash
# Create local backup
mongodump --uri="mongodb://localhost:27017/collab-editor-dev" \
  --out=./dev-backup

# Restore from backup
mongorestore --uri="mongodb://localhost:27017/collab-editor-dev" \
  ./dev-backup
```

### Staging

```bash
# Create staging backup via Atlas
atlas backups snapshots create staging-cluster \
  --desc "Pre-deployment backup"

# Restore to staging
atlas backups restores start \
  --snapshotId <snapshot-id> \
  --targetProjectId <project-id> \
  --targetClusterName staging-cluster-restore
```

### Production

```bash
# Production backups are automated via Atlas
# For emergency manual backup:
atlas backups snapshots create production-cluster \
  --desc "Emergency backup $(date +%Y%m%d-%H%M%S)" \
  --retention 30

# For disaster recovery:
# 1. Use Atlas point-in-time recovery
# 2. Restore to new cluster
# 3. Update connection strings
# 4. Verify data integrity
# 5. Switch traffic
```

## Troubleshooting

### Backup Failures

**Issue**: Backup job failed
**Solution**:
1. Check Atlas backup logs
2. Verify cluster health
3. Check available storage space
4. Retry the backup job
5. Contact MongoDB support if persistent

### Restore Failures

**Issue**: Restore operation failed
**Solution**:
1. Verify backup integrity
2. Check target cluster capacity
3. Review restore logs
4. Try restoring to a different cluster
5. Contact MongoDB support if persistent

### Data Inconsistency

**Issue**: Data appears inconsistent after restore
**Solution**:
1. Verify the backup point is correct
2. Check for ongoing transactions during backup
3. Run data validation queries
4. Consider using an earlier backup point
5. Manually reconcile critical data

## Contact and Support

- **MongoDB Atlas Support**: https://support.mongodb.com/
- **Atlas Documentation**: https://www.mongodb.com/docs/atlas/
- **Emergency Contact**: [Your DBA team contact]

## Appendix: Backup Checklist

### Daily Checks
- [ ] Verify backup jobs completed successfully
- [ ] Check backup size is reasonable
- [ ] Review any backup warnings

### Weekly Checks
- [ ] Test restore procedure on a sample backup
- [ ] Review backup retention policy
- [ ] Check backup storage costs

### Monthly Checks
- [ ] Full disaster recovery drill
- [ ] Review and update recovery procedures
- [ ] Verify backup compliance requirements
- [ ] Test backup restoration to different region

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Next Review**: 2024-06-01
