# API Versioning Strategy

This document outlines the API versioning strategy for the Collaborative Code Editor.

## Overview

The API uses URL-based versioning with the pattern `/api/v{version}/`. This approach provides clear version identification and allows for backward compatibility while enabling evolution of the API.

## Current Version

**Current API Version**: `v1`

All endpoints are currently served under `/api/v1/`.

## Versioning Principles

### 1. Backward Compatibility
- **Minor versions** (e.g., v1.1, v1.2) maintain backward compatibility
- **Major versions** (e.g., v1 → v2) may introduce breaking changes
- Deprecated features remain available for at least 6 months after deprecation notice

### 2. Version Lifecycle
Each API version follows this lifecycle:

1. **Active**: Current stable version, fully supported
2. **Deprecated**: Still functional but scheduled for removal
3. **Sunset**: No longer supported, returns 410 Gone

### 3. Breaking Changes
Breaking changes require a new major version and include:
- Removing or renaming endpoints
- Changing request/response schemas
- Modifying authentication mechanisms
- Changing error response formats
- Removing or renaming fields

### 4. Non-Breaking Changes
Non-breaking changes can be introduced in minor versions:
- Adding new optional fields to responses
- Adding new endpoints
- Adding new optional request parameters
- Improving performance
- Bug fixes

## Version Format

### URL Structure
```
/api/v{major}/{resource}
```

Examples:
- `/api/v1/projects`
- `/api/v1/auth/login`
- `/api/v2/projects` (future)

### Version Header (Optional)
Clients may optionally specify the API version via header:
```
Accept-Version: v1
```

This is primarily for documentation and future use. The URL version takes precedence.

## Deprecation Policy

### Deprecation Notice
When an API version is deprecated:
1. Add `Deprecation: true` header to all responses
2. Add `Sunset: <date>` header indicating removal date
3. Log deprecation warnings
4. Update documentation with migration guide
5. Notify API consumers via email/changelog

### Deprecation Timeline
- **Minimum deprecation period**: 6 months
- **Recommended deprecation period**: 12 months
- **Enterprise customers**: 18 months notice

### Sunset Response
After sunset, the API returns:
```json
{
  "success": false,
  "error": {
    "code": "API_VERSION_SUNSET",
    "message": "API version v1 is no longer supported. Please migrate to v2.",
    "migrationGuide": "https://docs.example.com/migration/v1-to-v2"
  }
}
```

HTTP Status: `410 Gone`

## Migration Guide

### When to Migrate
- Current version is deprecated
- New version provides required features
- Security vulnerabilities in old version
- Performance improvements in new version

### Migration Process
1. Review the migration guide for the target version
2. Update client code to use new endpoints
3. Test thoroughly in staging environment
4. Deploy to production
5. Monitor for issues

### Migration Support
- Detailed migration guides for each version
- Code examples and samples
- Dedicated support channel for migration questions
- Extended support for enterprise customers

## Version-Specific Documentation

### v1 (Current)
- **Status**: Active
- **Released**: 2024-01-01
- **Documentation**: [API Documentation](./API_DOCUMENTATION.md)
- **Sunset Date**: TBD

### v2 (Planned)
- **Status**: Planned
- **Expected Release**: TBD
- **Changes**: TBD
- **Migration Guide**: TBD

## Best Practices

### For API Consumers
1. **Pin to specific versions**: Always use explicit version in URLs
2. **Monitor deprecation notices**: Subscribe to changelog/notifications
3. **Test before upgrading**: Always test new versions in staging
4. **Plan migrations early**: Start migration well before sunset date
5. **Use version headers**: Include `Accept-Version` for clarity

### For API Developers
1. **Maintain backward compatibility**: Avoid breaking changes in minor versions
2. **Document all changes**: Update changelog and documentation
3. **Provide migration paths**: Clear guidance for breaking changes
4. **Monitor usage**: Track which versions are in use
5. **Communicate early**: Notify users well before deprecation

## Monitoring and Analytics

### Version Usage Tracking
Track API usage by version to:
- Identify deprecated version usage
- Plan migration campaigns
- Make informed decisions about sunset dates

### Metrics
- Requests per version
- Error rates per version
- Response times per version
- User adoption of new versions

## Implementation Details

### Version Detection
The API version is determined from the URL path:
```typescript
const versionMatch = req.path.match(/^\/api\/v(\d+)\//);
const apiVersion = versionMatch ? parseInt(versionMatch[1]) : 1;
```

### Version Routing
Each major version can have its own route handlers:
```typescript
// v1 routes
app.use('/api/v1/projects', projectRoutesV1);

// v2 routes (future)
app.use('/api/v2/projects', projectRoutesV2);
```

### Version Middleware
Optional middleware to handle version-specific logic:
```typescript
function versionMiddleware(req, res, next) {
  const version = extractVersion(req);
  req.apiVersion = version;
  
  // Apply version-specific logic
  if (version === 1) {
    // v1 specific handling
  } else if (version === 2) {
    // v2 specific handling
  }
  
  next();
}
```

## FAQ

### Q: How do I know which version I'm using?
A: Check the URL path. If it starts with `/api/v1/`, you're using v1.

### Q: What happens when a version is deprecated?
A: The API continues to work but returns deprecation headers. You should migrate to the new version.

### Q: How much time do I have to migrate?
A: At least 6 months from deprecation notice. Enterprise customers get 18 months.

### Q: Can I use multiple versions simultaneously?
A: Yes, you can use different versions for different endpoints during migration.

### Q: Will my existing integrations break?
A: No, deprecated versions continue to work until the sunset date.

### Q: How do I get help with migration?
A: Contact support or check the migration guide for your specific version.

## Contact and Support

- **API Support**: api-support@example.com
- **Migration Help**: migration-help@example.com
- **Documentation**: https://docs.example.com/api

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Next Review**: 2024-06-01
