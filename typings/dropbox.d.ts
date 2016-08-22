// Typings from a Gist by @jvilk
// See https://github.com/dropbox/dropbox-sdk-js/issues/65

declare module DropboxTypes {
  interface DropboxOptions {
    // An access token for making authenticated requests.
    accessToken: string;
    // The client id for your app. Used to create authentication URL.
    clientId: string;
    // Select user is only used by team endpoints. It specifies which user the team access token should be acting as.
    selectUser?: string;
  }

  class Dropbox {
    /**
     * The Dropbox SDK class.
     */
    constructor(options: { accessToken: string, clientId: string, selectUser: string });

    /**
     * Returns an instance of Dropbox that can make calls to user api endpoints on
     * behalf of the passed user id, using the team access token. Only relevant for
     * team endpoints.
     */
    actAsUser(userId: string): Dropbox;




    /**
     * Disables the access token used to authenticate the call.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<void>.
     * @param arg The request parameters.
     */
    public authTokenRevoke(arg: void): Promise<void>;

    /**
     * Returns the metadata for a file or folder. This is an alpha endpoint
     * compatible with the properties API. Note: Metadata for the root folder is
     * unsupported.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesAlphaGetMetadataError>.
     * @param arg The request parameters.
     */
    public filesAlphaGetMetadata(arg: FilesAlphaGetMetadataArg): Promise<FilesMetadata>;

    /**
     * Create a new file with the contents provided in the request. Note that
     * this endpoint is part of the properties API alpha and is slightly
     * different from upload. Do not use this to upload a file larger than 150
     * MB. Instead, create an upload session with upload_session/start.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesUploadErrorWithProperties>.
     * @param arg The request parameters.
     */
    public filesAlphaUpload(arg: FilesCommitInfoWithProperties): Promise<FilesFileMetadata>;

    /**
     * Copy a file or folder to a different location in the user's Dropbox. If
     * the source path is a folder all its contents will be copied.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesRelocationError>.
     * @param arg The request parameters.
     */
    public filesCopy(arg: FilesRelocationArg): Promise<FilesMetadata>;

    /**
     * Get a copy reference to a file or folder. This reference string can be
     * used to save that file or folder to another user's Dropbox by passing it
     * to copy_reference/save.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesGetCopyReferenceError>.
     * @param arg The request parameters.
     */
    public filesCopyReferenceGet(arg: FilesGetCopyReferenceArg): Promise<FilesGetCopyReferenceResult>;

    /**
     * Save a copy reference returned by copy_reference/get to the user's
     * Dropbox.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesSaveCopyReferenceError>.
     * @param arg The request parameters.
     */
    public filesCopyReferenceSave(arg: FilesSaveCopyReferenceArg): Promise<FilesSaveCopyReferenceResult>;

    /**
     * Create a folder at a given path.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesCreateFolderError>.
     * @param arg The request parameters.
     */
    public filesCreateFolder(arg: FilesCreateFolderArg): Promise<FilesFolderMetadata>;

    /**
     * Delete the file or folder at a given path. If the path is a folder, all
     * its contents will be deleted too. A successful response indicates that
     * the file or folder was deleted. The returned metadata will be the
     * corresponding FileMetadata or FolderMetadata for the item at time of
     * deletion, and not a DeletedMetadata object.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesDeleteError>.
     * @param arg The request parameters.
     */
    public filesDelete(arg: FilesDeleteArg): Promise<FilesMetadata>;

    /**
     * Download a file from a user's Dropbox.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesDownloadError>.
     * @param arg The request parameters.
     */
    public filesDownload(arg: FilesDownloadArg): Promise<FilesFileMetadata>;

    /**
     * Returns the metadata for a file or folder. Note: Metadata for the root
     * folder is unsupported.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesGetMetadataError>.
     * @param arg The request parameters.
     */
    public filesGetMetadata(arg: FilesGetMetadataArg): Promise<FilesMetadata>;

    /**
     * Get a preview for a file. Currently previews are only generated for the
     * files with  the following extensions: .doc, .docx, .docm, .ppt, .pps,
     * .ppsx, .ppsm, .pptx, .pptm,  .xls, .xlsx, .xlsm, .rtf
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesPreviewError>.
     * @param arg The request parameters.
     */
    public filesGetPreview(arg: FilesPreviewArg): Promise<FilesFileMetadata>;

    /**
     * Get a temporary link to stream content of a file. This link will expire
     * in four hours and afterwards you will get 410 Gone. Content-Type of the
     * link is determined automatically by the file's mime type.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesGetTemporaryLinkError>.
     * @param arg The request parameters.
     */
    public filesGetTemporaryLink(arg: FilesGetTemporaryLinkArg): Promise<FilesGetTemporaryLinkResult>;

    /**
     * Get a thumbnail for an image. This method currently supports files with
     * the following file extensions: jpg, jpeg, png, tiff, tif, gif and bmp.
     * Photos that are larger than 20MB in size won't be converted to a
     * thumbnail.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesThumbnailError>.
     * @param arg The request parameters.
     */
    public filesGetThumbnail(arg: FilesThumbnailArg): Promise<FilesFileMetadata>;

    /**
     * Returns the contents of a folder.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesListFolderError>.
     * @param arg The request parameters.
     */
    public filesListFolder(arg: FilesListFolderArg): Promise<FilesListFolderResult>;

    /**
     * Once a cursor has been retrieved from list_folder, use this to paginate
     * through all files and retrieve updates to the folder.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesListFolderContinueError>.
     * @param arg The request parameters.
     */
    public filesListFolderContinue(arg: FilesListFolderContinueArg): Promise<FilesListFolderResult>;

    /**
     * A way to quickly get a cursor for the folder's state. Unlike list_folder,
     * list_folder/get_latest_cursor doesn't return any entries. This endpoint
     * is for app which only needs to know about new files and modifications and
     * doesn't need to know about files that already exist in Dropbox.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesListFolderError>.
     * @param arg The request parameters.
     */
    public filesListFolderGetLatestCursor(arg: FilesListFolderArg): Promise<FilesListFolderGetLatestCursorResult>;

    /**
     * A longpoll endpoint to wait for changes on an account. In conjunction
     * with list_folder/continue, this call gives you a low-latency way to
     * monitor an account for file changes. The connection will block until
     * there are changes available or a timeout occurs. This endpoint is useful
     * mostly for client-side apps. If you're looking for server-side
     * notifications, check out our webhooks documentation
     * https://www.dropbox.com/developers/reference/webhooks.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesListFolderLongpollError>.
     * @param arg The request parameters.
     */
    public filesListFolderLongpoll(arg: FilesListFolderLongpollArg): Promise<FilesListFolderLongpollResult>;

    /**
     * Return revisions of a file
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesListRevisionsError>.
     * @param arg The request parameters.
     */
    public filesListRevisions(arg: FilesListRevisionsArg): Promise<FilesListRevisionsResult>;

    /**
     * Move a file or folder to a different location in the user's Dropbox. If
     * the source path is a folder all its contents will be moved.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesRelocationError>.
     * @param arg The request parameters.
     */
    public filesMove(arg: FilesRelocationArg): Promise<FilesMetadata>;

    /**
     * Permanently delete the file or folder at a given path (see
     * https://www.dropbox.com/en/help/40). Note: This endpoint is only
     * available for Dropbox Business apps.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesDeleteError>.
     * @param arg The request parameters.
     */
    public filesPermanentlyDelete(arg: FilesDeleteArg): Promise<void>;

    /**
     * Add custom properties to a file using a filled property template. See
     * properties/template/add to create new property templates.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesAddPropertiesError>.
     * @param arg The request parameters.
     */
    public filesPropertiesAdd(arg: FilesPropertyGroupWithPath): Promise<void>;

    /**
     * Overwrite custom properties from a specified template associated with a
     * file.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesInvalidPropertyGroupError>.
     * @param arg The request parameters.
     */
    public filesPropertiesOverwrite(arg: FilesPropertyGroupWithPath): Promise<void>;

    /**
     * Remove all custom properties from a specified template associated with a
     * file. To remove specific property key value pairs, see properties/update.
     * To update a property template, see properties/template/update. Property
     * templates can't be removed once created.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesRemovePropertiesError>.
     * @param arg The request parameters.
     */
    public filesPropertiesRemove(arg: FilesRemovePropertiesArg): Promise<void>;

    /**
     * Get the schema for a specified template.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<PropertiesPropertyTemplateError>.
     * @param arg The request parameters.
     */
    public filesPropertiesTemplateGet(arg: PropertiesGetPropertyTemplateArg): Promise<PropertiesGetPropertyTemplateResult>;

    /**
     * Get the property template identifiers for a user. To get the schema of
     * each template use properties/template/get.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<PropertiesPropertyTemplateError>.
     * @param arg The request parameters.
     */
    public filesPropertiesTemplateList(arg: void): Promise<PropertiesListPropertyTemplateIds>;

    /**
     * Add, update or remove custom properties from a specified template
     * associated with a file. Fields that already exist and not described in
     * the request will not be modified.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesUpdatePropertiesError>.
     * @param arg The request parameters.
     */
    public filesPropertiesUpdate(arg: FilesUpdatePropertyGroupArg): Promise<void>;

    /**
     * Restore a file to a specific revision
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesRestoreError>.
     * @param arg The request parameters.
     */
    public filesRestore(arg: FilesRestoreArg): Promise<FilesFileMetadata>;

    /**
     * Save a specified URL into a file in user's Dropbox. If the given path
     * already exists, the file will be renamed to avoid the conflict (e.g.
     * myfile (1).txt).
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesSaveUrlError>.
     * @param arg The request parameters.
     */
    public filesSaveUrl(arg: FilesSaveUrlArg): Promise<FilesSaveUrlResult>;

    /**
     * Check the status of a save_url job.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<AsyncPollError>.
     * @param arg The request parameters.
     */
    public filesSaveUrlCheckJobStatus(arg: AsyncPollArg): Promise<FilesSaveUrlJobStatus>;

    /**
     * Searches for files and folders. Note: Recent changes may not immediately
     * be reflected in search results due to a short delay in indexing.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesSearchError>.
     * @param arg The request parameters.
     */
    public filesSearch(arg: FilesSearchArg): Promise<FilesSearchResult>;

    /**
     * Create a new file with the contents provided in the request. Do not use
     * this to upload a file larger than 150 MB. Instead, create an upload
     * session with upload_session/start.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesUploadError>.
     * @param arg The request parameters.
     */
    public filesUpload(arg: FilesCommitInfo): Promise<FilesFileMetadata>;

    /**
     * Append more data to an upload session. A single request should not upload
     * more than 150 MB of file contents.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesUploadSessionLookupError>.
     * @deprecated
     * @param arg The request parameters.
     */
    public filesUploadSessionAppend(arg: FilesUploadSessionCursor): Promise<void>;

    /**
     * Append more data to an upload session. When the parameter close is set,
     * this call will close the session. A single request should not upload more
     * than 150 MB of file contents.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesUploadSessionLookupError>.
     * @param arg The request parameters.
     */
    public filesUploadSessionAppendV2(arg: FilesUploadSessionAppendArg): Promise<void>;

    /**
     * Finish an upload session and save the uploaded data to the given file
     * path. A single request should not upload more than 150 MB of file
     * contents.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<FilesUploadSessionFinishError>.
     * @param arg The request parameters.
     */
    public filesUploadSessionFinish(arg: FilesUploadSessionFinishArg): Promise<FilesFileMetadata>;

    /**
     * This route helps you commit many files at once into a user's Dropbox. Use
     * upload_session/start and upload_session/append_v2 to upload file
     * contents. We recommend uploading many files in parallel to increase
     * throughput. Once the file contents have been uploaded, rather than
     * calling upload_session/finish, use this route to finish all your upload
     * sessions in a single request. UploadSessionStartArg.close or
     * UploadSessionAppendArg.close needs to be true for last
     * upload_session/start or upload_session/append_v2 call. This route will
     * return job_id immediately and do the async commit job in background. We
     * have another route upload_session/finish_batch/check to check the job
     * status. For the same account, this route should be executed serially.
     * That means you should not start next job before current job finishes.
     * Also we only allow up to 1000 entries in a single request
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<void>.
     * @param arg The request parameters.
     */
    public filesUploadSessionFinishBatch(arg: FilesUploadSessionFinishBatchArg): Promise<AsyncLaunchEmptyResult>;

    /**
     * Returns the status of an asynchronous job for
     * upload_session/finish_batch. If success, it returns list of result for
     * each entry
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<AsyncPollError>.
     * @param arg The request parameters.
     */
    public filesUploadSessionFinishBatchCheck(arg: AsyncPollArg): Promise<FilesUploadSessionFinishBatchJobStatus>;

    /**
     * Upload sessions allow you to upload a single file using multiple
     * requests. This call starts a new upload session with the given data.  You
     * can then use upload_session/append_v2 to add more data and
     * upload_session/finish to save all the data to a file in Dropbox. A single
     * request should not upload more than 150 MB of file contents.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<void>.
     * @param arg The request parameters.
     */
    public filesUploadSessionStart(arg: FilesUploadSessionStartArg): Promise<FilesUploadSessionStartResult>;

    /**
     * Adds specified members to a file.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingAddFileMemberError>.
     * @param arg The request parameters.
     */
    public sharingAddFileMember(arg: SharingAddFileMemberArgs): Promise<Array<SharingFileMemberActionResult>>;

    /**
     * Allows an owner or editor (if the ACL update policy allows) of a shared
     * folder to add another member. For the new member to get access to all the
     * functionality for this folder, you will need to call mount_folder on
     * their behalf. Apps must have full Dropbox access to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingAddFolderMemberError>.
     * @param arg The request parameters.
     */
    public sharingAddFolderMember(arg: SharingAddFolderMemberArg): Promise<void>;

    /**
     * Changes a member's access on a shared file.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingFileMemberActionError>.
     * @param arg The request parameters.
     */
    public sharingChangeFileMemberAccess(arg: SharingChangeFileMemberAccessArgs): Promise<SharingFileMemberActionResult>;

    /**
     * Returns the status of an asynchronous job. Apps must have full Dropbox
     * access to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<AsyncPollError>.
     * @param arg The request parameters.
     */
    public sharingCheckJobStatus(arg: AsyncPollArg): Promise<SharingJobStatus>;

    /**
     * Returns the status of an asynchronous job for sharing a folder. Apps must
     * have full Dropbox access to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<AsyncPollError>.
     * @param arg The request parameters.
     */
    public sharingCheckRemoveMemberJobStatus(arg: AsyncPollArg): Promise<SharingRemoveMemberJobStatus>;

    /**
     * Returns the status of an asynchronous job for sharing a folder. Apps must
     * have full Dropbox access to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<AsyncPollError>.
     * @param arg The request parameters.
     */
    public sharingCheckShareJobStatus(arg: AsyncPollArg): Promise<SharingShareFolderJobStatus>;

    /**
     * Create a shared link. If a shared link already exists for the given path,
     * that link is returned. Note that in the returned PathLinkMetadata, the
     * PathLinkMetadata.url field is the shortened URL if
     * CreateSharedLinkArg.short_url argument is set to true. Previously, it was
     * technically possible to break a shared link by moving or renaming the
     * corresponding file or folder. In the future, this will no longer be the
     * case, so your app shouldn't rely on this behavior. Instead, if your app
     * needs to revoke a shared link, use revoke_shared_link.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingCreateSharedLinkError>.
     * @deprecated
     * @param arg The request parameters.
     */
    public sharingCreateSharedLink(arg: SharingCreateSharedLinkArg): Promise<SharingPathLinkMetadata>;

    /**
     * Create a shared link with custom settings. If no settings are given then
     * the default visibility is RequestedVisibility.public (The resolved
     * visibility, though, may depend on other aspects such as team and shared
     * folder settings).
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingCreateSharedLinkWithSettingsError>.
     * @param arg The request parameters.
     */
    public sharingCreateSharedLinkWithSettings(arg: SharingCreateSharedLinkWithSettingsArg): Promise<SharingSharedLinkMetadata>;

    /**
     * Returns shared file metadata.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingGetFileMetadataError>.
     * @param arg The request parameters.
     */
    public sharingGetFileMetadata(arg: SharingGetFileMetadataArg): Promise<SharingSharedFileMetadata>;

    /**
     * Returns shared file metadata.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingSharingUserError>.
     * @param arg The request parameters.
     */
    public sharingGetFileMetadataBatch(arg: SharingGetFileMetadataBatchArg): Promise<Array<SharingGetFileMetadataBatchResult>>;

    /**
     * Returns shared folder metadata by its folder ID. Apps must have full
     * Dropbox access to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingSharedFolderAccessError>.
     * @param arg The request parameters.
     */
    public sharingGetFolderMetadata(arg: SharingGetMetadataArgs): Promise<SharingSharedFolderMetadata>;

    /**
     * Download the shared link's file from a user's Dropbox.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingGetSharedLinkFileError>.
     * @param arg The request parameters.
     */
    public sharingGetSharedLinkFile(arg: Object): Promise<SharingSharedLinkMetadata>;

    /**
     * Get the shared link's metadata.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingSharedLinkError>.
     * @param arg The request parameters.
     */
    public sharingGetSharedLinkMetadata(arg: SharingGetSharedLinkMetadataArg): Promise<SharingSharedLinkMetadata>;

    /**
     * Returns a list of LinkMetadata objects for this user, including
     * collection links. If no path is given or the path is empty, returns a
     * list of all shared links for the current user, including collection
     * links. If a non-empty path is given, returns a list of all shared links
     * that allow access to the given path.  Collection links are never returned
     * in this case. Note that the url field in the response is never the
     * shortened URL.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingGetSharedLinksError>.
     * @deprecated
     * @param arg The request parameters.
     */
    public sharingGetSharedLinks(arg: SharingGetSharedLinksArg): Promise<SharingGetSharedLinksResult>;

    /**
     * Use to obtain the members who have been invited to a file, both inherited
     * and uninherited members.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingListFileMembersError>.
     * @param arg The request parameters.
     */
    public sharingListFileMembers(arg: SharingListFileMembersArg): Promise<SharingSharedFileMembers>;

    /**
     * Get members of multiple files at once. The arguments to this route are
     * more limited, and the limit on query result size per file is more strict.
     * To customize the results more, use the individual file endpoint.
     * Inherited users are not included in the result, and permissions are not
     * returned for this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingSharingUserError>.
     * @param arg The request parameters.
     */
    public sharingListFileMembersBatch(arg: SharingListFileMembersBatchArg): Promise<Array<SharingListFileMembersBatchResult>>;

    /**
     * Once a cursor has been retrieved from list_file_members or
     * list_file_members/batch, use this to paginate through all shared file
     * members.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingListFileMembersContinueError>.
     * @param arg The request parameters.
     */
    public sharingListFileMembersContinue(arg: SharingListFileMembersContinueArg): Promise<SharingSharedFileMembers>;

    /**
     * Returns shared folder membership by its folder ID. Apps must have full
     * Dropbox access to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingSharedFolderAccessError>.
     * @param arg The request parameters.
     */
    public sharingListFolderMembers(arg: SharingListFolderMembersArgs): Promise<SharingSharedFolderMembers>;

    /**
     * Once a cursor has been retrieved from list_folder_members, use this to
     * paginate through all shared folder members. Apps must have full Dropbox
     * access to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingListFolderMembersContinueError>.
     * @param arg The request parameters.
     */
    public sharingListFolderMembersContinue(arg: SharingListFolderMembersContinueArg): Promise<SharingSharedFolderMembers>;

    /**
     * Return the list of all shared folders the current user has access to.
     * Apps must have full Dropbox access to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<void>.
     * @param arg The request parameters.
     */
    public sharingListFolders(arg: SharingListFoldersArgs): Promise<SharingListFoldersResult>;

    /**
     * Once a cursor has been retrieved from list_folders, use this to paginate
     * through all shared folders. The cursor must come from a previous call to
     * list_folders or list_folders/continue. Apps must have full Dropbox access
     * to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingListFoldersContinueError>.
     * @param arg The request parameters.
     */
    public sharingListFoldersContinue(arg: SharingListFoldersContinueArg): Promise<SharingListFoldersResult>;

    /**
     * Return the list of all shared folders the current user can mount or
     * unmount. Apps must have full Dropbox access to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<void>.
     * @param arg The request parameters.
     */
    public sharingListMountableFolders(arg: SharingListFoldersArgs): Promise<SharingListFoldersResult>;

    /**
     * Once a cursor has been retrieved from list_mountable_folders, use this to
     * paginate through all mountable shared folders. The cursor must come from
     * a previous call to list_mountable_folders or
     * list_mountable_folders/continue. Apps must have full Dropbox access to
     * use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingListFoldersContinueError>.
     * @param arg The request parameters.
     */
    public sharingListMountableFoldersContinue(arg: SharingListFoldersContinueArg): Promise<SharingListFoldersResult>;

    /**
     * Returns a list of all files shared with current user.  Does not include
     * files the user has received via shared folders, and does  not include
     * unclaimed invitations.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingSharingUserError>.
     * @param arg The request parameters.
     */
    public sharingListReceivedFiles(arg: SharingListFilesArg): Promise<SharingListFilesResult>;

    /**
     * Get more results with a cursor from list_received_files.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingListFilesContinueError>.
     * @param arg The request parameters.
     */
    public sharingListReceivedFilesContinue(arg: SharingListFilesContinueArg): Promise<SharingListFilesResult>;

    /**
     * List shared links of this user. If no path is given or the path is empty,
     * returns a list of all shared links for the current user. If a non-empty
     * path is given, returns a list of all shared links that allow access to
     * the given path - direct links to the given path and links to parent
     * folders of the given path. Links to parent folders can be suppressed by
     * setting direct_only to true.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingListSharedLinksError>.
     * @param arg The request parameters.
     */
    public sharingListSharedLinks(arg: SharingListSharedLinksArg): Promise<SharingListSharedLinksResult>;

    /**
     * Modify the shared link's settings. If the requested visibility conflict
     * with the shared links policy of the team or the shared folder (in case
     * the linked file is part of a shared folder) then the
     * LinkPermissions.resolved_visibility of the returned SharedLinkMetadata
     * will reflect the actual visibility of the shared link and the
     * LinkPermissions.requested_visibility will reflect the requested
     * visibility.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingModifySharedLinkSettingsError>.
     * @param arg The request parameters.
     */
    public sharingModifySharedLinkSettings(arg: SharingModifySharedLinkSettingsArgs): Promise<SharingSharedLinkMetadata>;

    /**
     * The current user mounts the designated folder. Mount a shared folder for
     * a user after they have been added as a member. Once mounted, the shared
     * folder will appear in their Dropbox. Apps must have full Dropbox access
     * to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingMountFolderError>.
     * @param arg The request parameters.
     */
    public sharingMountFolder(arg: SharingMountFolderArg): Promise<SharingSharedFolderMetadata>;

    /**
     * The current user relinquishes their membership in the designated file.
     * Note that the current user may still have inherited access to this file
     * through the parent folder. Apps must have full Dropbox access to use this
     * endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingRelinquishFileMembershipError>.
     * @param arg The request parameters.
     */
    public sharingRelinquishFileMembership(arg: SharingRelinquishFileMembershipArg): Promise<void>;

    /**
     * The current user relinquishes their membership in the designated shared
     * folder and will no longer have access to the folder.  A folder owner
     * cannot relinquish membership in their own folder. This will run
     * synchronously if leave_a_copy is false, and asynchronously if
     * leave_a_copy is true. Apps must have full Dropbox access to use this
     * endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingRelinquishFolderMembershipError>.
     * @param arg The request parameters.
     */
    public sharingRelinquishFolderMembership(arg: SharingRelinquishFolderMembershipArg): Promise<AsyncLaunchEmptyResult>;

    /**
     * Identical to remove_file_member_2 but with less information returned.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingRemoveFileMemberError>.
     * @deprecated
     * @param arg The request parameters.
     */
    public sharingRemoveFileMember(arg: SharingRemoveFileMemberArg): Promise<SharingFileMemberActionIndividualResult>;

    /**
     * Removes a specified member from the file.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingRemoveFileMemberError>.
     * @param arg The request parameters.
     */
    public sharingRemoveFileMember2(arg: SharingRemoveFileMemberArg): Promise<SharingFileMemberRemoveActionResult>;

    /**
     * Allows an owner or editor (if the ACL update policy allows) of a shared
     * folder to remove another member. Apps must have full Dropbox access to
     * use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingRemoveFolderMemberError>.
     * @param arg The request parameters.
     */
    public sharingRemoveFolderMember(arg: SharingRemoveFolderMemberArg): Promise<AsyncLaunchResultBase>;

    /**
     * Revoke a shared link. Note that even after revoking a shared link to a
     * file, the file may be accessible if there are shared links leading to any
     * of the file parent folders. To list all shared links that enable access
     * to a specific file, you can use the list_shared_links with the file as
     * the ListSharedLinksArg.path argument.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingRevokeSharedLinkError>.
     * @param arg The request parameters.
     */
    public sharingRevokeSharedLink(arg: SharingRevokeSharedLinkArg): Promise<void>;

    /**
     * Share a folder with collaborators. Most sharing will be completed
     * synchronously. Large folders will be completed asynchronously. To make
     * testing the async case repeatable, set `ShareFolderArg.force_async`. If a
     * ShareFolderLaunch.async_job_id is returned, you'll need to call
     * check_share_job_status until the action completes to get the metadata for
     * the folder. Apps must have full Dropbox access to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingShareFolderError>.
     * @param arg The request parameters.
     */
    public sharingShareFolder(arg: SharingShareFolderArg): Promise<SharingShareFolderLaunch>;

    /**
     * Transfer ownership of a shared folder to a member of the shared folder.
     * User must have AccessLevel.owner access to the shared folder to perform a
     * transfer. Apps must have full Dropbox access to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingTransferFolderError>.
     * @param arg The request parameters.
     */
    public sharingTransferFolder(arg: SharingTransferFolderArg): Promise<void>;

    /**
     * The current user unmounts the designated folder. They can re-mount the
     * folder at a later time using mount_folder. Apps must have full Dropbox
     * access to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingUnmountFolderError>.
     * @param arg The request parameters.
     */
    public sharingUnmountFolder(arg: SharingUnmountFolderArg): Promise<void>;

    /**
     * Remove all members from this file. Does not remove inherited members.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingUnshareFileError>.
     * @param arg The request parameters.
     */
    public sharingUnshareFile(arg: SharingUnshareFileArg): Promise<void>;

    /**
     * Allows a shared folder owner to unshare the folder. You'll need to call
     * check_job_status to determine if the action has completed successfully.
     * Apps must have full Dropbox access to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingUnshareFolderError>.
     * @param arg The request parameters.
     */
    public sharingUnshareFolder(arg: SharingUnshareFolderArg): Promise<AsyncLaunchEmptyResult>;

    /**
     * Allows an owner or editor of a shared folder to update another member's
     * permissions. Apps must have full Dropbox access to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingUpdateFolderMemberError>.
     * @param arg The request parameters.
     */
    public sharingUpdateFolderMember(arg: SharingUpdateFolderMemberArg): Promise<SharingMemberAccessLevelResult>;

    /**
     * Update the sharing policies for a shared folder. User must have
     * AccessLevel.owner access to the shared folder to update its policies.
     * Apps must have full Dropbox access to use this endpoint.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<SharingUpdateFolderPolicyError>.
     * @param arg The request parameters.
     */
    public sharingUpdateFolderPolicy(arg: SharingUpdateFolderPolicyArg): Promise<SharingSharedFolderMetadata>;

    /**
     * Creates a new, empty group, with a requested name. Permission : Team
     * member management
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamGroupCreateError>.
     * @param arg The request parameters.
     */
    public teamAlphaGroupsCreate(arg: TeamGroupCreateArg): Promise<TeamGroupFullInfo>;

    /**
     * Retrieves information about one or more groups. Permission : Team
     * Information
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamGroupsGetInfoError>.
     * @param arg The request parameters.
     */
    public teamAlphaGroupsGetInfo(arg: TeamGroupsSelector): Promise<Object>;

    /**
     * Lists groups on a team. Permission : Team Information
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<void>.
     * @param arg The request parameters.
     */
    public teamAlphaGroupsList(arg: TeamGroupsListArg): Promise<TeamGroupsListResult>;

    /**
     * Once a cursor has been retrieved from alpha/groups/list, use this to
     * paginate through all groups. Permission : Team information
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamGroupsListContinueError>.
     * @param arg The request parameters.
     */
    public teamAlphaGroupsListContinue(arg: TeamGroupsListContinueArg): Promise<TeamGroupsListResult>;

    /**
     * Updates a group's name, external ID or management type. Permission : Team
     * member management
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamGroupUpdateError>.
     * @param arg The request parameters.
     */
    public teamAlphaGroupsUpdate(arg: TeamGroupUpdateArgs): Promise<TeamGroupFullInfo>;

    /**
     * List all device sessions of a team's member.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamListMemberDevicesError>.
     * @param arg The request parameters.
     */
    public teamDevicesListMemberDevices(arg: TeamListMemberDevicesArg): Promise<TeamListMemberDevicesResult>;

    /**
     * List all device sessions of a team.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamListMembersDevicesError>.
     * @param arg The request parameters.
     */
    public teamDevicesListMembersDevices(arg: TeamListMembersDevicesArg): Promise<TeamListMembersDevicesResult>;

    /**
     * List all device sessions of a team.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamListTeamDevicesError>.
     * @deprecated
     * @param arg The request parameters.
     */
    public teamDevicesListTeamDevices(arg: TeamListTeamDevicesArg): Promise<TeamListTeamDevicesResult>;

    /**
     * Revoke a device session of a team's member
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamRevokeDeviceSessionError>.
     * @param arg The request parameters.
     */
    public teamDevicesRevokeDeviceSession(arg: TeamRevokeDeviceSessionArg): Promise<void>;

    /**
     * Revoke a list of device sessions of team members
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamRevokeDeviceSessionBatchError>.
     * @param arg The request parameters.
     */
    public teamDevicesRevokeDeviceSessionBatch(arg: TeamRevokeDeviceSessionBatchArg): Promise<TeamRevokeDeviceSessionBatchResult>;

    /**
     * Retrieves information about a team.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<void>.
     * @param arg The request parameters.
     */
    public teamGetInfo(arg: void): Promise<TeamTeamGetInfoResult>;

    /**
     * Creates a new, empty group, with a requested name. Permission : Team
     * member management
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamGroupCreateError>.
     * @param arg The request parameters.
     */
    public teamGroupsCreate(arg: TeamGroupCreateArg): Promise<TeamGroupFullInfo>;

    /**
     * Deletes a group. The group is deleted immediately. However the revoking
     * of group-owned resources may take additional time. Use the
     * groups/job_status/get to determine whether this process has completed.
     * Permission : Team member management
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamGroupDeleteError>.
     * @param arg The request parameters.
     */
    public teamGroupsDelete(arg: TeamGroupSelector): Promise<AsyncLaunchEmptyResult>;

    /**
     * Retrieves information about one or more groups. Permission : Team
     * Information
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamGroupsGetInfoError>.
     * @param arg The request parameters.
     */
    public teamGroupsGetInfo(arg: TeamGroupsSelector): Promise<Object>;

    /**
     * Once an async_job_id is returned from groups/delete, groups/members/add ,
     * or groups/members/remove use this method to poll the status of
     * granting/revoking group members' access to group-owned resources.
     * Permission : Team member management
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamGroupsPollError>.
     * @param arg The request parameters.
     */
    public teamGroupsJobStatusGet(arg: AsyncPollArg): Promise<AsyncPollEmptyResult>;

    /**
     * Lists groups on a team. Permission : Team Information
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<void>.
     * @param arg The request parameters.
     */
    public teamGroupsList(arg: TeamGroupsListArg): Promise<TeamGroupsListResult>;

    /**
     * Once a cursor has been retrieved from groups/list, use this to paginate
     * through all groups. Permission : Team information
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamGroupsListContinueError>.
     * @param arg The request parameters.
     */
    public teamGroupsListContinue(arg: TeamGroupsListContinueArg): Promise<TeamGroupsListResult>;

    /**
     * Adds members to a group. The members are added immediately. However the
     * granting of group-owned resources may take additional time. Use the
     * groups/job_status/get to determine whether this process has completed.
     * Permission : Team member management
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamGroupMembersAddError>.
     * @param arg The request parameters.
     */
    public teamGroupsMembersAdd(arg: TeamGroupMembersAddArg): Promise<TeamGroupMembersChangeResult>;

    /**
     * Lists members of a group. Permission : Team Information
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamGroupSelectorError>.
     * @param arg The request parameters.
     */
    public teamGroupsMembersList(arg: TeamGroupsMembersListArg): Promise<TeamGroupsMembersListResult>;

    /**
     * Once a cursor has been retrieved from groups/members/list, use this to
     * paginate through all members of the group. Permission : Team information
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamGroupsMembersListContinueError>.
     * @param arg The request parameters.
     */
    public teamGroupsMembersListContinue(arg: TeamGroupsMembersListContinueArg): Promise<TeamGroupsMembersListResult>;

    /**
     * Removes members from a group. The members are removed immediately.
     * However the revoking of group-owned resources may take additional time.
     * Use the groups/job_status/get to determine whether this process has
     * completed. This method permits removing the only owner of a group, even
     * in cases where this is not possible via the web client. Permission : Team
     * member management
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamGroupMembersRemoveError>.
     * @param arg The request parameters.
     */
    public teamGroupsMembersRemove(arg: TeamGroupMembersRemoveArg): Promise<TeamGroupMembersChangeResult>;

    /**
     * Sets a member's access type in a group. Permission : Team member
     * management
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamGroupMemberSetAccessTypeError>.
     * @param arg The request parameters.
     */
    public teamGroupsMembersSetAccessType(arg: TeamGroupMembersSetAccessTypeArg): Promise<Object>;

    /**
     * Updates a group's name and/or external ID. Permission : Team member
     * management
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamGroupUpdateError>.
     * @param arg The request parameters.
     */
    public teamGroupsUpdate(arg: TeamGroupUpdateArgs): Promise<TeamGroupFullInfo>;

    /**
     * List all linked applications of the team member. Note, this endpoint does
     * not list any team-linked applications.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamListMemberAppsError>.
     * @param arg The request parameters.
     */
    public teamLinkedAppsListMemberLinkedApps(arg: TeamListMemberAppsArg): Promise<TeamListMemberAppsResult>;

    /**
     * List all applications linked to the team members' accounts. Note, this
     * endpoint does not list any team-linked applications.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamListMembersAppsError>.
     * @param arg The request parameters.
     */
    public teamLinkedAppsListMembersLinkedApps(arg: TeamListMembersAppsArg): Promise<TeamListMembersAppsResult>;

    /**
     * List all applications linked to the team members' accounts. Note, this
     * endpoint doesn't list any team-linked applications.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamListTeamAppsError>.
     * @deprecated
     * @param arg The request parameters.
     */
    public teamLinkedAppsListTeamLinkedApps(arg: TeamListTeamAppsArg): Promise<TeamListTeamAppsResult>;

    /**
     * Revoke a linked application of the team member
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamRevokeLinkedAppError>.
     * @param arg The request parameters.
     */
    public teamLinkedAppsRevokeLinkedApp(arg: TeamRevokeLinkedApiAppArg): Promise<void>;

    /**
     * Revoke a list of linked applications of the team members
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamRevokeLinkedAppBatchError>.
     * @param arg The request parameters.
     */
    public teamLinkedAppsRevokeLinkedAppBatch(arg: TeamRevokeLinkedApiAppBatchArg): Promise<TeamRevokeLinkedAppBatchResult>;

    /**
     * Adds members to a team. Permission : Team member management A maximum of
     * 20 members can be specified in a single call. If no Dropbox account
     * exists with the email address specified, a new Dropbox account will be
     * created with the given email address, and that account will be invited to
     * the team. If a personal Dropbox account exists with the email address
     * specified in the call, this call will create a placeholder Dropbox
     * account for the user on the team and send an email inviting the user to
     * migrate their existing personal account onto the team. Team member
     * management apps are required to set an initial given_name and surname for
     * a user to use in the team invitation and for 'Perform as team member'
     * actions taken on the user before they become 'active'.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<void>.
     * @param arg The request parameters.
     */
    public teamMembersAdd(arg: TeamMembersAddArg): Promise<TeamMembersAddLaunch>;

    /**
     * Once an async_job_id is returned from members/add , use this to poll the
     * status of the asynchronous request. Permission : Team member management
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<AsyncPollError>.
     * @param arg The request parameters.
     */
    public teamMembersAddJobStatusGet(arg: AsyncPollArg): Promise<TeamMembersAddJobStatus>;

    /**
     * Returns information about multiple team members. Permission : Team
     * information This endpoint will return MembersGetInfoItem.id_not_found,
     * for IDs (or emails) that cannot be matched to a valid team member.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamMembersGetInfoError>.
     * @param arg The request parameters.
     */
    public teamMembersGetInfo(arg: TeamMembersGetInfoArgs): Promise<Object>;

    /**
     * Lists members of a team. Permission : Team information
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamMembersListError>.
     * @param arg The request parameters.
     */
    public teamMembersList(arg: TeamMembersListArg): Promise<TeamMembersListResult>;

    /**
     * Once a cursor has been retrieved from members/list, use this to paginate
     * through all team members. Permission : Team information
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamMembersListContinueError>.
     * @param arg The request parameters.
     */
    public teamMembersListContinue(arg: TeamMembersListContinueArg): Promise<TeamMembersListResult>;

    /**
     * Recover a deleted member. Permission : Team member management Exactly one
     * of team_member_id, email, or external_id must be provided to identify the
     * user account.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamMembersRecoverError>.
     * @param arg The request parameters.
     */
    public teamMembersRecover(arg: TeamMembersRecoverArg): Promise<void>;

    /**
     * Removes a member from a team. Permission : Team member management Exactly
     * one of team_member_id, email, or external_id must be provided to identify
     * the user account. This is not a deactivation where the account can be
     * re-activated again. Calling members/add with the removed user's email
     * address will create a new account with a new team_member_id that will not
     * have access to any content that was shared with the initial account. This
     * endpoint may initiate an asynchronous job. To obtain the final result of
     * the job, the client should periodically poll
     * members/remove/job_status/get.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamMembersRemoveError>.
     * @param arg The request parameters.
     */
    public teamMembersRemove(arg: TeamMembersRemoveArg): Promise<AsyncLaunchEmptyResult>;

    /**
     * Once an async_job_id is returned from members/remove , use this to poll
     * the status of the asynchronous request. Permission : Team member
     * management
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<AsyncPollError>.
     * @param arg The request parameters.
     */
    public teamMembersRemoveJobStatusGet(arg: AsyncPollArg): Promise<AsyncPollEmptyResult>;

    /**
     * Sends welcome email to pending team member. Permission : Team member
     * management Exactly one of team_member_id, email, or external_id must be
     * provided to identify the user account. No-op if team member is not
     * pending.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamMembersSendWelcomeError>.
     * @param arg The request parameters.
     */
    public teamMembersSendWelcomeEmail(arg: TeamUserSelectorArg): Promise<void>;

    /**
     * Updates a team member's permissions. Permission : Team member management
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamMembersSetPermissionsError>.
     * @param arg The request parameters.
     */
    public teamMembersSetAdminPermissions(arg: TeamMembersSetPermissionsArg): Promise<TeamMembersSetPermissionsResult>;

    /**
     * Updates a team member's profile. Permission : Team member management
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamMembersSetProfileError>.
     * @param arg The request parameters.
     */
    public teamMembersSetProfile(arg: TeamMembersSetProfileArg): Promise<TeamTeamMemberInfo>;

    /**
     * Suspend a member from a team. Permission : Team member management Exactly
     * one of team_member_id, email, or external_id must be provided to identify
     * the user account.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamMembersSuspendError>.
     * @param arg The request parameters.
     */
    public teamMembersSuspend(arg: TeamMembersDeactivateArg): Promise<void>;

    /**
     * Unsuspend a member from a team. Permission : Team member management
     * Exactly one of team_member_id, email, or external_id must be provided to
     * identify the user account.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamMembersUnsuspendError>.
     * @param arg The request parameters.
     */
    public teamMembersUnsuspend(arg: TeamMembersUnsuspendArg): Promise<void>;

    /**
     * Add a property template. See route files/properties/add to add properties
     * to a file.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<PropertiesModifyPropertyTemplateError>.
     * @param arg The request parameters.
     */
    public teamPropertiesTemplateAdd(arg: TeamAddPropertyTemplateArg): Promise<TeamAddPropertyTemplateResult>;

    /**
     * Get the schema for a specified template.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<PropertiesPropertyTemplateError>.
     * @param arg The request parameters.
     */
    public teamPropertiesTemplateGet(arg: PropertiesGetPropertyTemplateArg): Promise<PropertiesGetPropertyTemplateResult>;

    /**
     * Get the property template identifiers for a team. To get the schema of
     * each template use properties/template/get.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<PropertiesPropertyTemplateError>.
     * @param arg The request parameters.
     */
    public teamPropertiesTemplateList(arg: void): Promise<PropertiesListPropertyTemplateIds>;

    /**
     * Update a property template. This route can update the template name, the
     * template description and add optional properties to templates.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<PropertiesModifyPropertyTemplateError>.
     * @param arg The request parameters.
     */
    public teamPropertiesTemplateUpdate(arg: TeamUpdatePropertyTemplateArg): Promise<TeamUpdatePropertyTemplateResult>;

    /**
     * Retrieves reporting data about a team's user activity.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamDateRangeError>.
     * @param arg The request parameters.
     */
    public teamReportsGetActivity(arg: TeamDateRange): Promise<TeamGetActivityReport>;

    /**
     * Retrieves reporting data about a team's linked devices.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamDateRangeError>.
     * @param arg The request parameters.
     */
    public teamReportsGetDevices(arg: TeamDateRange): Promise<TeamGetDevicesReport>;

    /**
     * Retrieves reporting data about a team's membership.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamDateRangeError>.
     * @param arg The request parameters.
     */
    public teamReportsGetMembership(arg: TeamDateRange): Promise<TeamGetMembershipReport>;

    /**
     * Retrieves reporting data about a team's storage usage.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<TeamDateRangeError>.
     * @param arg The request parameters.
     */
    public teamReportsGetStorage(arg: TeamDateRange): Promise<TeamGetStorageReport>;

    /**
     * Get information about a user's account.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<UsersGetAccountError>.
     * @param arg The request parameters.
     */
    public usersGetAccount(arg: UsersGetAccountArg): Promise<UsersBasicAccount>;

    /**
     * Get information about multiple user accounts.  At most 300 accounts may
     * be queried per request.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<UsersGetAccountBatchError>.
     * @param arg The request parameters.
     */
    public usersGetAccountBatch(arg: UsersGetAccountBatchArg): Promise<Object>;

    /**
     * Get information about the current user's account.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<void>.
     * @param arg The request parameters.
     */
    public usersGetCurrentAccount(arg: void): Promise<UsersFullAccount>;

    /**
     * Get the space usage information for the current user's account.
     * 
     * When an error occurs, the route rejects the promise with type
     * Error<void>.
     * @param arg The request parameters.
     */
    public usersGetSpaceUsage(arg: void): Promise<UsersSpaceUsage>;
  }


  /**
   * An Error object returned from a route.
   */
  interface Error<T> {
    // Text summary of the error.
    error_summary: string;
    // The error object.
    error: T;
    // User-friendly error message.
    user_message: UserMessage;
  }
  
  /**
   * User-friendly error message.
   */
  interface UserMessage {
    // The message.
    text: string;
    // The locale of the message.
    locale: string;
  }
  
  type Timestamp = string;
  

  /**
   * The job finished synchronously and successfully.
   */
  interface AsyncLaunchEmptyResultComplete {
    '.tag': 'complete';
  }

  /**
   * Result returned by methods that may either launch an asynchronous job or
   * complete synchronously. Upon synchronous completion of the job, no
   * additional information is returned.
   */
  type AsyncLaunchEmptyResult = AsyncLaunchResultBase | AsyncLaunchEmptyResultComplete;

  /**
   * This response indicates that the processing is asynchronous. The string is
   * an id that can be used to obtain the status of the asynchronous job.
   */
  interface AsyncLaunchResultBaseAsyncJobId {
    '.tag': 'async_job_id';
    async_job_id: string;
  }

  /**
   * Result returned by methods that launch an asynchronous job. A method who
   * may either launch an asynchronous job, or complete the request
   * synchronously, can use this union by extending it, and adding a 'complete'
   * field with the type of the synchronous response. See
   * :type:`LaunchEmptyResult` for an example.
   */
  type AsyncLaunchResultBase = AsyncLaunchResultBaseAsyncJobId;

  /**
   * Arguments for methods that poll the status of an asynchronous job.
   */
  interface AsyncPollArg {
    /**
     * Id of the asynchronous job. This is the value of a response returned from
     * the method that launched the job.
     */
    async_job_id: string;
  }

  /**
   * The asynchronous job has completed successfully.
   */
  interface AsyncPollEmptyResultComplete {
    '.tag': 'complete';
  }

  /**
   * Result returned by methods that poll for the status of an asynchronous job.
   * Upon completion of the job, no additional information is returned.
   */
  type AsyncPollEmptyResult = AsyncPollResultBase | AsyncPollEmptyResultComplete;

  /**
   * The job ID is invalid.
   */
  interface AsyncPollErrorInvalidAsyncJobId {
    '.tag': 'invalid_async_job_id';
  }

  /**
   * Something went wrong with the job on Dropbox's end. You'll need to verify
   * that the action you were taking succeeded, and if not, try again. This
   * should happen very rarely.
   */
  interface AsyncPollErrorInternalError {
    '.tag': 'internal_error';
  }

  interface AsyncPollErrorOther {
    '.tag': 'other';
  }

  /**
   * Error returned by methods for polling the status of asynchronous job.
   */
  type AsyncPollError = AsyncPollErrorInvalidAsyncJobId | AsyncPollErrorInternalError | AsyncPollErrorOther;

  /**
   * The asynchronous job is still in progress.
   */
  interface AsyncPollResultBaseInProgress {
    '.tag': 'in_progress';
  }

  /**
   * Result returned by methods that poll for the status of an asynchronous job.
   * Unions that extend this union should add a 'complete' field with a type of
   * the information returned upon job completion. See :type:`PollEmptyResult`
   * for an example.
   */
  type AsyncPollResultBase = AsyncPollResultBaseInProgress;

  /**
   * The access token is invalid.
   */
  interface AuthAuthErrorInvalidAccessToken {
    '.tag': 'invalid_access_token';
  }

  /**
   * The user specified in 'Dropbox-API-Select-User' is no longer on the team.
   */
  interface AuthAuthErrorInvalidSelectUser {
    '.tag': 'invalid_select_user';
  }

  /**
   * The user specified in 'Dropbox-API-Select-Admin' is not a Dropbox Business
   * team admin.
   */
  interface AuthAuthErrorInvalidSelectAdmin {
    '.tag': 'invalid_select_admin';
  }

  interface AuthAuthErrorOther {
    '.tag': 'other';
  }

  /**
   * Errors occurred during authentication.
   */
  type AuthAuthError = AuthAuthErrorInvalidAccessToken | AuthAuthErrorInvalidSelectUser | AuthAuthErrorInvalidSelectAdmin | AuthAuthErrorOther;

  /**
   * Error occurred because the app is being rate limited.
   */
  interface AuthRateLimitError {
    /**
     * The reason why the app is being rate limited.
     */
    reason: AuthRateLimitReason;
    /**
     * The number of seconds that the app should wait before making another
     * request.
     */
    retry_after: number;
  }

  /**
   * You are making too many requests in the past few minutes.
   */
  interface AuthRateLimitReasonTooManyRequests {
    '.tag': 'too_many_requests';
  }

  /**
   * There are currently too many write operations happening in the user's
   * Dropbox.
   */
  interface AuthRateLimitReasonTooManyWriteOperations {
    '.tag': 'too_many_write_operations';
  }

  interface AuthRateLimitReasonOther {
    '.tag': 'other';
  }

  type AuthRateLimitReason = AuthRateLimitReasonTooManyRequests | AuthRateLimitReasonTooManyWriteOperations | AuthRateLimitReasonOther;

  /**
   * This property group already exists for this file.
   */
  interface FilesAddPropertiesErrorPropertyGroupAlreadyExists {
    '.tag': 'property_group_already_exists';
  }

  type FilesAddPropertiesError = FilesInvalidPropertyGroupError | FilesAddPropertiesErrorPropertyGroupAlreadyExists;

  interface FilesAlphaGetMetadataArg extends FilesGetMetadataArg {
    /**
     * If set to a valid list of template IDs,
     * :field:`FileMetadata.property_groups` is set for files with custom
     * properties.
     */
    include_property_templates?: Array<Object>;
  }

  interface FilesAlphaGetMetadataErrorPropertiesError {
    '.tag': 'properties_error';
    properties_error: FilesLookUpPropertiesError;
  }

  type FilesAlphaGetMetadataError = FilesGetMetadataError | FilesAlphaGetMetadataErrorPropertiesError;

  interface FilesCommitInfo {
    /**
     * The file contents to be uploaded.
     */
    contents: Object;
    /**
     * Path in the user's Dropbox to save the file.
     */
    path: string;
    /**
     * Selects what to do if the file already exists.
     */
    mode: FilesWriteMode;
    /**
     * If there's a conflict, as determined by :field:`mode`, have the Dropbox
     * server try to autorename the file to avoid conflict.
     */
    autorename: boolean;
    /**
     * The value to store as the :field:`client_modified` timestamp. Dropbox
     * automatically records the time at which the file was written to the
     * Dropbox servers. It can also record an additional timestamp, provided by
     * Dropbox desktop clients, mobile clients, and API apps of when the file
     * was actually created or modified.
     */
    client_modified?: Timestamp;
    /**
     * Normally, users are made aware of any file modifications in their Dropbox
     * account via notifications in the client software. If :val:`true`, this
     * tells the clients that this modification shouldn't result in a user
     * notification.
     */
    mute: boolean;
  }

  interface FilesCommitInfoWithProperties extends FilesCommitInfo {
    /**
     * The file contents to be uploaded.
     */
    contents: Object;
    /**
     * List of custom properties to add to file.
     */
    property_groups?: Array<PropertiesPropertyGroup>;
  }

  interface FilesCreateFolderArg {
    /**
     * Path in the user's Dropbox to create.
     */
    path: string;
  }

  interface FilesCreateFolderErrorPath {
    '.tag': 'path';
    path: FilesWriteError;
  }

  type FilesCreateFolderError = FilesCreateFolderErrorPath;

  interface FilesDeleteArg {
    /**
     * Path in the user's Dropbox to delete.
     */
    path: string;
  }

  interface FilesDeleteErrorPathLookup {
    '.tag': 'path_lookup';
    path_lookup: FilesLookupError;
  }

  interface FilesDeleteErrorPathWrite {
    '.tag': 'path_write';
    path_write: FilesWriteError;
  }

  interface FilesDeleteErrorOther {
    '.tag': 'other';
  }

  type FilesDeleteError = FilesDeleteErrorPathLookup | FilesDeleteErrorPathWrite | FilesDeleteErrorOther;

  /**
   * Indicates that there used to be a file or folder at this path, but it no
   * longer exists.
   */
  interface FilesDeletedMetadata extends FilesMetadata {
  }

  /**
   * Dimensions for a photo or video.
   */
  interface FilesDimensions {
    /**
     * Height of the photo/video.
     */
    height: number;
    /**
     * Width of the photo/video.
     */
    width: number;
  }

  interface FilesDownloadArg {
    /**
     * The path of the file to download.
     */
    path: string;
    /**
     * Deprecated. Please specify revision in :field:`path` instead
     */
    rev?: string;
  }

  interface FilesDownloadErrorPath {
    '.tag': 'path';
    path: FilesLookupError;
  }

  interface FilesDownloadErrorOther {
    '.tag': 'other';
  }

  type FilesDownloadError = FilesDownloadErrorPath | FilesDownloadErrorOther;

  interface FilesFileMetadata extends FilesMetadata {
    /**
     * A unique identifier for the file.
     */
    id: string;
    /**
     * For files, this is the modification time set by the desktop client when
     * the file was added to Dropbox. Since this time is not verified (the
     * Dropbox server stores whatever the desktop client sends up), this should
     * only be used for display purposes (such as sorting) and not, for example,
     * to determine if a file has changed or not.
     */
    client_modified: Timestamp;
    /**
     * The last time the file was modified on Dropbox.
     */
    server_modified: Timestamp;
    /**
     * A unique identifier for the current revision of a file. This field is the
     * same rev as elsewhere in the API and can be used to detect changes and
     * avoid conflicts.
     */
    rev: string;
    /**
     * The file size in bytes.
     */
    size: number;
    /**
     * Additional information if the file is a photo or video.
     */
    media_info?: FilesMediaInfo;
    /**
     * Set if this file is contained in a shared folder.
     */
    sharing_info?: FilesFileSharingInfo;
    /**
     * Additional information if the file has custom properties with the
     * property template specified.
     */
    property_groups?: Array<PropertiesPropertyGroup>;
    /**
     * This flag will only be present if include_has_explicit_shared_members  is
     * true in :route:`list_folder` or :route:`get_metadata`. If this  flag is
     * present, it will be true if this file has any explicit shared  members.
     * This is different from sharing_info in that this could be true  in the
     * case where a file has explicit members but is not contained within  a
     * shared folder.
     */
    has_explicit_shared_members?: boolean;
  }

  /**
   * Sharing info for a file which is contained by a shared folder.
   */
  interface FilesFileSharingInfo extends FilesSharingInfo {
    /**
     * ID of shared folder that holds this file.
     */
    parent_shared_folder_id: string;
    /**
     * The last user who modified the file. This field will be null if the
     * user's account has been deleted.
     */
    modified_by?: string;
  }

  interface FilesFolderMetadata extends FilesMetadata {
    /**
     * A unique identifier for the folder.
     */
    id: string;
    /**
     * Deprecated. Please use :field:`sharing_info` instead.
     */
    shared_folder_id?: string;
    /**
     * Set if the folder is contained in a shared folder or is a shared folder
     * mount point.
     */
    sharing_info?: FilesFolderSharingInfo;
    /**
     * Additional information if the file has custom properties with the
     * property template specified.
     */
    property_groups?: Array<PropertiesPropertyGroup>;
  }

  /**
   * Sharing info for a folder which is contained in a shared folder or is a
   * shared folder mount point.
   */
  interface FilesFolderSharingInfo extends FilesSharingInfo {
    /**
     * Set if the folder is contained by a shared folder.
     */
    parent_shared_folder_id?: string;
    /**
     * If this folder is a shared folder mount point, the ID of the shared
     * folder mounted at this location.
     */
    shared_folder_id?: string;
    /**
     * Specifies that the folder can only be traversed and the user can only see
     * a limited subset of the contents of this folder because they don't have
     * read access to this folder. They do, however, have access to some sub
     * folder.
     */
    traverse_only: boolean;
    /**
     * Specifies that the folder cannot be accessed by the user
     */
    no_access: boolean;
  }

  interface FilesGetCopyReferenceArg {
    /**
     * The path to the file or folder you want to get a copy reference to.
     */
    path: string;
  }

  interface FilesGetCopyReferenceErrorPath {
    '.tag': 'path';
    path: FilesLookupError;
  }

  interface FilesGetCopyReferenceErrorOther {
    '.tag': 'other';
  }

  type FilesGetCopyReferenceError = FilesGetCopyReferenceErrorPath | FilesGetCopyReferenceErrorOther;

  interface FilesGetCopyReferenceResult {
    /**
     * Metadata of the file or folder.
     */
    metadata: FilesMetadata;
    /**
     * A copy reference to the file or folder.
     */
    copy_reference: string;
    /**
     * The expiration date of the copy reference. This value is currently set to
     * be far enough in the future so that expiration is effectively not an
     * issue.
     */
    expires: Timestamp;
  }

  interface FilesGetMetadataArg {
    /**
     * The path of a file or folder on Dropbox.
     */
    path: string;
    /**
     * If true, :field:`FileMetadata.media_info` is set for photo and video.
     */
    include_media_info: boolean;
    /**
     * If true, :type:`DeletedMetadata` will be returned for deleted file or
     * folder, otherwise :field:`LookupError.not_found` will be returned.
     */
    include_deleted: boolean;
    /**
     * If true, the results will include a flag for each file indicating whether
     * or not  that file has any explicit members.
     */
    include_has_explicit_shared_members: boolean;
  }

  interface FilesGetMetadataErrorPath {
    '.tag': 'path';
    path: FilesLookupError;
  }

  type FilesGetMetadataError = FilesGetMetadataErrorPath;

  interface FilesGetTemporaryLinkArg {
    /**
     * The path to the file you want a temporary link to.
     */
    path: string;
  }

  interface FilesGetTemporaryLinkErrorPath {
    '.tag': 'path';
    path: FilesLookupError;
  }

  interface FilesGetTemporaryLinkErrorOther {
    '.tag': 'other';
  }

  type FilesGetTemporaryLinkError = FilesGetTemporaryLinkErrorPath | FilesGetTemporaryLinkErrorOther;

  interface FilesGetTemporaryLinkResult {
    /**
     * Metadata of the file.
     */
    metadata: FilesFileMetadata;
    /**
     * The temporary link which can be used to stream content the file.
     */
    link: string;
  }

  /**
   * GPS coordinates for a photo or video.
   */
  interface FilesGpsCoordinates {
    /**
     * Latitude of the GPS coordinates.
     */
    latitude: number;
    /**
     * Longitude of the GPS coordinates.
     */
    longitude: number;
  }

  /**
   * A field value in this property group is too large.
   */
  interface FilesInvalidPropertyGroupErrorPropertyFieldTooLarge {
    '.tag': 'property_field_too_large';
  }

  /**
   * The property group specified does not conform to the property template.
   */
  interface FilesInvalidPropertyGroupErrorDoesNotFitTemplate {
    '.tag': 'does_not_fit_template';
  }

  type FilesInvalidPropertyGroupError = FilesPropertiesError | FilesInvalidPropertyGroupErrorPropertyFieldTooLarge | FilesInvalidPropertyGroupErrorDoesNotFitTemplate;

  interface FilesListFolderArg {
    /**
     * The path to the folder you want to see the contents of.
     */
    path: string;
    /**
     * If true, the list folder operation will be applied recursively to all
     * subfolders and the response will contain contents of all subfolders.
     */
    recursive: boolean;
    /**
     * If true, :field:`FileMetadata.media_info` is set for photo and video.
     */
    include_media_info: boolean;
    /**
     * If true, the results will include entries for files and folders that used
     * to exist but were deleted.
     */
    include_deleted: boolean;
    /**
     * If true, the results will include a flag for each file indicating whether
     * or not  that file has any explicit members.
     */
    include_has_explicit_shared_members: boolean;
  }

  interface FilesListFolderContinueArg {
    /**
     * The cursor returned by your last call to :route:`list_folder` or
     * :route:`list_folder/continue`.
     */
    cursor: string;
  }

  interface FilesListFolderContinueErrorPath {
    '.tag': 'path';
    path: FilesLookupError;
  }

  /**
   * Indicates that the cursor has been invalidated. Call :route:`list_folder`
   * to obtain a new cursor.
   */
  interface FilesListFolderContinueErrorReset {
    '.tag': 'reset';
  }

  interface FilesListFolderContinueErrorOther {
    '.tag': 'other';
  }

  type FilesListFolderContinueError = FilesListFolderContinueErrorPath | FilesListFolderContinueErrorReset | FilesListFolderContinueErrorOther;

  interface FilesListFolderErrorPath {
    '.tag': 'path';
    path: FilesLookupError;
  }

  interface FilesListFolderErrorOther {
    '.tag': 'other';
  }

  type FilesListFolderError = FilesListFolderErrorPath | FilesListFolderErrorOther;

  interface FilesListFolderGetLatestCursorResult {
    /**
     * Pass the cursor into :route:`list_folder/continue` to see what's changed
     * in the folder since your previous query.
     */
    cursor: string;
  }

  interface FilesListFolderLongpollArg {
    /**
     * A cursor as returned by :route:`list_folder` or
     * :route:`list_folder/continue`. Cursors retrieved by setting
     * :field:`ListFolderArg.include_media_info` to :val:`true` are not
     * supported.
     */
    cursor: string;
    /**
     * A timeout in seconds. The request will block for at most this length of
     * time, plus up to 90 seconds of random jitter added to avoid the
     * thundering herd problem. Care should be taken when using this parameter,
     * as some network infrastructure does not support long timeouts.
     */
    timeout: number;
  }

  /**
   * Indicates that the cursor has been invalidated. Call :route:`list_folder`
   * to obtain a new cursor.
   */
  interface FilesListFolderLongpollErrorReset {
    '.tag': 'reset';
  }

  interface FilesListFolderLongpollErrorOther {
    '.tag': 'other';
  }

  type FilesListFolderLongpollError = FilesListFolderLongpollErrorReset | FilesListFolderLongpollErrorOther;

  interface FilesListFolderLongpollResult {
    /**
     * Indicates whether new changes are available. If true, call
     * :route:`list_folder/continue` to retrieve the changes.
     */
    changes: boolean;
    /**
     * If present, backoff for at least this many seconds before calling
     * :route:`list_folder/longpoll` again.
     */
    backoff?: number;
  }

  interface FilesListFolderResult {
    /**
     * The files and (direct) subfolders in the folder.
     */
    entries: Array<FilesMetadata>;
    /**
     * Pass the cursor into :route:`list_folder/continue` to see what's changed
     * in the folder since your previous query.
     */
    cursor: string;
    /**
     * If true, then there are more entries available. Pass the cursor to
     * :route:`list_folder/continue` to retrieve the rest.
     */
    has_more: boolean;
  }

  interface FilesListRevisionsArg {
    /**
     * The path to the file you want to see the revisions of.
     */
    path: string;
    /**
     * The maximum number of revision entries returned.
     */
    limit: number;
  }

  interface FilesListRevisionsErrorPath {
    '.tag': 'path';
    path: FilesLookupError;
  }

  interface FilesListRevisionsErrorOther {
    '.tag': 'other';
  }

  type FilesListRevisionsError = FilesListRevisionsErrorPath | FilesListRevisionsErrorOther;

  interface FilesListRevisionsResult {
    /**
     * If the file is deleted.
     */
    is_deleted: boolean;
    /**
     * The revisions for the file. Only non-delete revisions will show up here.
     */
    entries: Array<FilesFileMetadata>;
  }

  /**
   * This property group does not exist for this file.
   */
  interface FilesLookUpPropertiesErrorPropertyGroupNotFound {
    '.tag': 'property_group_not_found';
  }

  type FilesLookUpPropertiesError = FilesLookUpPropertiesErrorPropertyGroupNotFound;

  interface FilesLookupErrorMalformedPath {
    '.tag': 'malformed_path';
    malformed_path: string;
  }

  /**
   * There is nothing at the given path.
   */
  interface FilesLookupErrorNotFound {
    '.tag': 'not_found';
  }

  /**
   * We were expecting a file, but the given path refers to something that isn't
   * a file.
   */
  interface FilesLookupErrorNotFile {
    '.tag': 'not_file';
  }

  /**
   * We were expecting a folder, but the given path refers to something that
   * isn't a folder.
   */
  interface FilesLookupErrorNotFolder {
    '.tag': 'not_folder';
  }

  /**
   * The file cannot be transferred because the content is restricted.  For
   * example, sometimes there are legal restrictions due to copyright claims.
   */
  interface FilesLookupErrorRestrictedContent {
    '.tag': 'restricted_content';
  }

  interface FilesLookupErrorOther {
    '.tag': 'other';
  }

  type FilesLookupError = FilesLookupErrorMalformedPath | FilesLookupErrorNotFound | FilesLookupErrorNotFile | FilesLookupErrorNotFolder | FilesLookupErrorRestrictedContent | FilesLookupErrorOther;

  /**
   * Indicate the photo/video is still under processing and metadata is not
   * available yet.
   */
  interface FilesMediaInfoPending {
    '.tag': 'pending';
  }

  /**
   * The metadata for the photo/video.
   */
  interface FilesMediaInfoMetadata {
    '.tag': 'metadata';
    metadata: FilesMediaMetadata;
  }

  type FilesMediaInfo = FilesMediaInfoPending | FilesMediaInfoMetadata;

  /**
   * Metadata for a photo or video.
   */
  interface FilesMediaMetadata {
    /**
     * Dimension of the photo/video.
     */
    dimensions?: FilesDimensions;
    /**
     * The GPS coordinate of the photo/video.
     */
    location?: FilesGpsCoordinates;
    /**
     * The timestamp when the photo/video is taken.
     */
    time_taken?: Timestamp;
  }

  /**
   * Metadata for a file or folder.
   */
  interface FilesMetadata {
    /**
     * The last component of the path (including extension). This never contains
     * a slash.
     */
    name: string;
    /**
     * The lowercased full path in the user's Dropbox. This always starts with a
     * slash. This field will be null if the file or folder is not mounted.
     */
    path_lower?: string;
    /**
     * The cased path to be used for display purposes only. In rare instances
     * the casing will not correctly match the user's filesystem, but this
     * behavior will match the path provided in the Core API v1. Changes to the
     * casing of paths won't be returned by :route:`list_folder/continue`. This
     * field will be null if the file or folder is not mounted.
     */
    path_display?: string;
    /**
     * Deprecated. Please use :field:`FileSharingInfo.parent_shared_folder_id`
     * or :field:`FolderSharingInfo.parent_shared_folder_id` instead.
     */
    parent_shared_folder_id?: string;
  }

  /**
   * Metadata for a photo.
   */
  interface FilesPhotoMetadata extends FilesMediaMetadata {
  }

  interface FilesPreviewArg {
    /**
     * The path of the file to preview.
     */
    path: string;
    /**
     * Deprecated. Please specify revision in :field:`path` instead
     */
    rev?: string;
  }

  /**
   * An error occurs when downloading metadata for the file.
   */
  interface FilesPreviewErrorPath {
    '.tag': 'path';
    path: FilesLookupError;
  }

  /**
   * This preview generation is still in progress and the file is not ready  for
   * preview yet.
   */
  interface FilesPreviewErrorInProgress {
    '.tag': 'in_progress';
  }

  /**
   * The file extension is not supported preview generation.
   */
  interface FilesPreviewErrorUnsupportedExtension {
    '.tag': 'unsupported_extension';
  }

  /**
   * The file content is not supported for preview generation.
   */
  interface FilesPreviewErrorUnsupportedContent {
    '.tag': 'unsupported_content';
  }

  type FilesPreviewError = FilesPreviewErrorPath | FilesPreviewErrorInProgress | FilesPreviewErrorUnsupportedExtension | FilesPreviewErrorUnsupportedContent;

  interface FilesPropertiesErrorPath {
    '.tag': 'path';
    path: FilesLookupError;
  }

  type FilesPropertiesError = PropertiesPropertyTemplateError | FilesPropertiesErrorPath;

  interface FilesPropertyGroupUpdate {
    /**
     * A unique identifier for a property template.
     */
    template_id: string;
    /**
     * List of property fields to update if the field already exists. If the
     * field doesn't exist, add the field to the property group.
     */
    add_or_update_fields?: Array<PropertiesPropertyField>;
    /**
     * List of property field names to remove from property group if the field
     * exists.
     */
    remove_fields?: Array<string>;
  }

  interface FilesPropertyGroupWithPath {
    /**
     * A unique identifier for the file.
     */
    path: string;
    /**
     * Filled custom property templates associated with a file.
     */
    property_groups: Array<PropertiesPropertyGroup>;
  }

  interface FilesRelocationArg {
    /**
     * Path in the user's Dropbox to be copied or moved.
     */
    from_path: string;
    /**
     * Path in the user's Dropbox that is the destination.
     */
    to_path: string;
  }

  interface FilesRelocationErrorFromLookup {
    '.tag': 'from_lookup';
    from_lookup: FilesLookupError;
  }

  interface FilesRelocationErrorFromWrite {
    '.tag': 'from_write';
    from_write: FilesWriteError;
  }

  interface FilesRelocationErrorTo {
    '.tag': 'to';
    to: FilesWriteError;
  }

  /**
   * Shared folders can't be copied.
   */
  interface FilesRelocationErrorCantCopySharedFolder {
    '.tag': 'cant_copy_shared_folder';
  }

  /**
   * Your move operation would result in nested shared folders.  This is not
   * allowed.
   */
  interface FilesRelocationErrorCantNestSharedFolder {
    '.tag': 'cant_nest_shared_folder';
  }

  /**
   * You cannot move a folder into itself.
   */
  interface FilesRelocationErrorCantMoveFolderIntoItself {
    '.tag': 'cant_move_folder_into_itself';
  }

  /**
   * The operation would involve more than 10,000 files and folders.
   */
  interface FilesRelocationErrorTooManyFiles {
    '.tag': 'too_many_files';
  }

  interface FilesRelocationErrorOther {
    '.tag': 'other';
  }

  type FilesRelocationError = FilesRelocationErrorFromLookup | FilesRelocationErrorFromWrite | FilesRelocationErrorTo | FilesRelocationErrorCantCopySharedFolder | FilesRelocationErrorCantNestSharedFolder | FilesRelocationErrorCantMoveFolderIntoItself | FilesRelocationErrorTooManyFiles | FilesRelocationErrorOther;

  interface FilesRemovePropertiesArg {
    /**
     * A unique identifier for the file.
     */
    path: string;
    /**
     * A list of identifiers for a property template created by route
     * properties/template/add.
     */
    property_template_ids: Array<Object>;
  }

  interface FilesRemovePropertiesErrorPropertyGroupLookup {
    '.tag': 'property_group_lookup';
    property_group_lookup: FilesLookUpPropertiesError;
  }

  type FilesRemovePropertiesError = FilesPropertiesError | FilesRemovePropertiesErrorPropertyGroupLookup;

  interface FilesRestoreArg {
    /**
     * The path to the file you want to restore.
     */
    path: string;
    /**
     * The revision to restore for the file.
     */
    rev: string;
  }

  /**
   * An error occurs when downloading metadata for the file.
   */
  interface FilesRestoreErrorPathLookup {
    '.tag': 'path_lookup';
    path_lookup: FilesLookupError;
  }

  /**
   * An error occurs when trying to restore the file to that path.
   */
  interface FilesRestoreErrorPathWrite {
    '.tag': 'path_write';
    path_write: FilesWriteError;
  }

  /**
   * The revision is invalid. It may point to a different file.
   */
  interface FilesRestoreErrorInvalidRevision {
    '.tag': 'invalid_revision';
  }

  interface FilesRestoreErrorOther {
    '.tag': 'other';
  }

  type FilesRestoreError = FilesRestoreErrorPathLookup | FilesRestoreErrorPathWrite | FilesRestoreErrorInvalidRevision | FilesRestoreErrorOther;

  interface FilesSaveCopyReferenceArg {
    /**
     * A copy reference returned by :route:`copy_reference/get`.
     */
    copy_reference: string;
    /**
     * Path in the user's Dropbox that is the destination.
     */
    path: string;
  }

  interface FilesSaveCopyReferenceErrorPath {
    '.tag': 'path';
    path: FilesWriteError;
  }

  /**
   * The copy reference is invalid.
   */
  interface FilesSaveCopyReferenceErrorInvalidCopyReference {
    '.tag': 'invalid_copy_reference';
  }

  /**
   * You don't have permission to save the given copy reference. Please make
   * sure this app is same app which created the copy reference and the source
   * user is still linked to the app.
   */
  interface FilesSaveCopyReferenceErrorNoPermission {
    '.tag': 'no_permission';
  }

  /**
   * The file referenced by the copy reference cannot be found.
   */
  interface FilesSaveCopyReferenceErrorNotFound {
    '.tag': 'not_found';
  }

  /**
   * The operation would involve more than 10,000 files and folders.
   */
  interface FilesSaveCopyReferenceErrorTooManyFiles {
    '.tag': 'too_many_files';
  }

  interface FilesSaveCopyReferenceErrorOther {
    '.tag': 'other';
  }

  type FilesSaveCopyReferenceError = FilesSaveCopyReferenceErrorPath | FilesSaveCopyReferenceErrorInvalidCopyReference | FilesSaveCopyReferenceErrorNoPermission | FilesSaveCopyReferenceErrorNotFound | FilesSaveCopyReferenceErrorTooManyFiles | FilesSaveCopyReferenceErrorOther;

  interface FilesSaveCopyReferenceResult {
    /**
     * The metadata of the saved file or folder in the user's Dropbox.
     */
    metadata: FilesMetadata;
  }

  interface FilesSaveUrlArg {
    /**
     * The path in Dropbox where the URL will be saved to.
     */
    path: string;
    /**
     * The URL to be saved.
     */
    url: string;
  }

  interface FilesSaveUrlErrorPath {
    '.tag': 'path';
    path: FilesWriteError;
  }

  /**
   * Failed downloading the given URL.
   */
  interface FilesSaveUrlErrorDownloadFailed {
    '.tag': 'download_failed';
  }

  /**
   * The given URL is invalid.
   */
  interface FilesSaveUrlErrorInvalidUrl {
    '.tag': 'invalid_url';
  }

  /**
   * The file where the URL is saved to no longer exists.
   */
  interface FilesSaveUrlErrorNotFound {
    '.tag': 'not_found';
  }

  interface FilesSaveUrlErrorOther {
    '.tag': 'other';
  }

  type FilesSaveUrlError = FilesSaveUrlErrorPath | FilesSaveUrlErrorDownloadFailed | FilesSaveUrlErrorInvalidUrl | FilesSaveUrlErrorNotFound | FilesSaveUrlErrorOther;

  /**
   * Metadata of the file where the URL is saved to.
   */
  interface FilesSaveUrlJobStatusComplete {
    '.tag': 'complete';
    complete: FilesFileMetadata;
  }

  interface FilesSaveUrlJobStatusFailed {
    '.tag': 'failed';
    failed: FilesSaveUrlError;
  }

  type FilesSaveUrlJobStatus = AsyncPollResultBase | FilesSaveUrlJobStatusComplete | FilesSaveUrlJobStatusFailed;

  /**
   * Metadata of the file where the URL is saved to.
   */
  interface FilesSaveUrlResultComplete {
    '.tag': 'complete';
    complete: FilesFileMetadata;
  }

  type FilesSaveUrlResult = AsyncLaunchResultBase | FilesSaveUrlResultComplete;

  interface FilesSearchArg {
    /**
     * The path in the user's Dropbox to search. Should probably be a folder.
     */
    path: string;
    /**
     * The string to search for. The search string is split on spaces into
     * multiple tokens. For file name searching, the last token is used for
     * prefix matching (i.e. "bat c" matches "bat cave" but not "batman car").
     */
    query: string;
    /**
     * The starting index within the search results (used for paging).
     */
    start: number;
    /**
     * The maximum number of search results to return.
     */
    max_results: number;
    /**
     * The search mode (filename, filename_and_content, or deleted_filename).
     * Note that searching file content is only available for Dropbox Business
     * accounts.
     */
    mode: FilesSearchMode;
  }

  interface FilesSearchErrorPath {
    '.tag': 'path';
    path: FilesLookupError;
  }

  interface FilesSearchErrorOther {
    '.tag': 'other';
  }

  type FilesSearchError = FilesSearchErrorPath | FilesSearchErrorOther;

  interface FilesSearchMatch {
    /**
     * The type of the match.
     */
    match_type: FilesSearchMatchType;
    /**
     * The metadata for the matched file or folder.
     */
    metadata: FilesMetadata;
  }

  /**
   * This item was matched on its file or folder name.
   */
  interface FilesSearchMatchTypeFilename {
    '.tag': 'filename';
  }

  /**
   * This item was matched based on its file contents.
   */
  interface FilesSearchMatchTypeContent {
    '.tag': 'content';
  }

  /**
   * This item was matched based on both its contents and its file name.
   */
  interface FilesSearchMatchTypeBoth {
    '.tag': 'both';
  }

  /**
   * Indicates what type of match was found for a given item.
   */
  type FilesSearchMatchType = FilesSearchMatchTypeFilename | FilesSearchMatchTypeContent | FilesSearchMatchTypeBoth;

  /**
   * Search file and folder names.
   */
  interface FilesSearchModeFilename {
    '.tag': 'filename';
  }

  /**
   * Search file and folder names as well as file contents.
   */
  interface FilesSearchModeFilenameAndContent {
    '.tag': 'filename_and_content';
  }

  /**
   * Search for deleted file and folder names.
   */
  interface FilesSearchModeDeletedFilename {
    '.tag': 'deleted_filename';
  }

  type FilesSearchMode = FilesSearchModeFilename | FilesSearchModeFilenameAndContent | FilesSearchModeDeletedFilename;

  interface FilesSearchResult {
    /**
     * A list (possibly empty) of matches for the query.
     */
    matches: Array<FilesSearchMatch>;
    /**
     * Used for paging. If true, indicates there is another page of results
     * available that can be fetched by calling :route:`search` again.
     */
    more: boolean;
    /**
     * Used for paging. Value to set the start argument to when calling
     * :route:`search` to fetch the next page of results.
     */
    start: number;
  }

  /**
   * Sharing info for a file or folder.
   */
  interface FilesSharingInfo {
    /**
     * True if the file or folder is inside a read-only shared folder.
     */
    read_only: boolean;
  }

  interface FilesThumbnailArg {
    /**
     * The path to the image file you want to thumbnail.
     */
    path: string;
    /**
     * The format for the thumbnail image, jpeg (default) or png. For  images
     * that are photos, jpeg should be preferred, while png is  better for
     * screenshots and digital arts.
     */
    format: FilesThumbnailFormat;
    /**
     * The size for the thumbnail image.
     */
    size: FilesThumbnailSize;
  }

  /**
   * An error occurs when downloading metadata for the image.
   */
  interface FilesThumbnailErrorPath {
    '.tag': 'path';
    path: FilesLookupError;
  }

  /**
   * The file extension doesn't allow conversion to a thumbnail.
   */
  interface FilesThumbnailErrorUnsupportedExtension {
    '.tag': 'unsupported_extension';
  }

  /**
   * The image cannot be converted to a thumbnail.
   */
  interface FilesThumbnailErrorUnsupportedImage {
    '.tag': 'unsupported_image';
  }

  /**
   * An error occurs during thumbnail conversion.
   */
  interface FilesThumbnailErrorConversionError {
    '.tag': 'conversion_error';
  }

  type FilesThumbnailError = FilesThumbnailErrorPath | FilesThumbnailErrorUnsupportedExtension | FilesThumbnailErrorUnsupportedImage | FilesThumbnailErrorConversionError;

  interface FilesThumbnailFormatJpeg {
    '.tag': 'jpeg';
  }

  interface FilesThumbnailFormatPng {
    '.tag': 'png';
  }

  type FilesThumbnailFormat = FilesThumbnailFormatJpeg | FilesThumbnailFormatPng;

  /**
   * 32 by 32 px.
   */
  interface FilesThumbnailSizeW32h32 {
    '.tag': 'w32h32';
  }

  /**
   * 64 by 64 px.
   */
  interface FilesThumbnailSizeW64h64 {
    '.tag': 'w64h64';
  }

  /**
   * 128 by 128 px.
   */
  interface FilesThumbnailSizeW128h128 {
    '.tag': 'w128h128';
  }

  /**
   * 640 by 480 px.
   */
  interface FilesThumbnailSizeW640h480 {
    '.tag': 'w640h480';
  }

  /**
   * 1024 by 768
   */
  interface FilesThumbnailSizeW1024h768 {
    '.tag': 'w1024h768';
  }

  type FilesThumbnailSize = FilesThumbnailSizeW32h32 | FilesThumbnailSizeW64h64 | FilesThumbnailSizeW128h128 | FilesThumbnailSizeW640h480 | FilesThumbnailSizeW1024h768;

  interface FilesUpdatePropertiesErrorPropertyGroupLookup {
    '.tag': 'property_group_lookup';
    property_group_lookup: FilesLookUpPropertiesError;
  }

  type FilesUpdatePropertiesError = FilesInvalidPropertyGroupError | FilesUpdatePropertiesErrorPropertyGroupLookup;

  interface FilesUpdatePropertyGroupArg {
    /**
     * A unique identifier for the file.
     */
    path: string;
    /**
     * Filled custom property templates associated with a file.
     */
    update_property_groups: Array<FilesPropertyGroupUpdate>;
  }

  /**
   * Unable to save the uploaded contents to a file.
   */
  interface FilesUploadErrorPath {
    '.tag': 'path';
    path: FilesUploadWriteFailed;
  }

  interface FilesUploadErrorOther {
    '.tag': 'other';
  }

  type FilesUploadError = FilesUploadErrorPath | FilesUploadErrorOther;

  interface FilesUploadErrorWithPropertiesPropertiesError {
    '.tag': 'properties_error';
    properties_error: FilesInvalidPropertyGroupError;
  }

  type FilesUploadErrorWithProperties = FilesUploadError | FilesUploadErrorWithPropertiesPropertiesError;

  interface FilesUploadSessionAppendArg {
    /**
     * The file contents to be uploaded.
     */
    contents: Object;
    /**
     * Contains the upload session ID and the offset.
     */
    cursor: FilesUploadSessionCursor;
    /**
     * If true, the current session will be closed, at which point you won't be
     * able to call :route:`upload_session/append_v2` anymore with the current
     * session.
     */
    close: boolean;
  }

  interface FilesUploadSessionCursor {
    /**
     * The file contents to be uploaded.
     */
    contents: Object;
    /**
     * The upload session ID (returned by :route:`upload_session/start`).
     */
    session_id: string;
    /**
     * The amount of data that has been uploaded so far. We use this to make
     * sure upload data isn't lost or duplicated in the event of a network
     * error.
     */
    offset: number;
  }

  interface FilesUploadSessionFinishArg {
    /**
     * The file contents to be uploaded.
     */
    contents: Object;
    /**
     * Contains the upload session ID and the offset.
     */
    cursor: FilesUploadSessionCursor;
    /**
     * Contains the path and other optional modifiers for the commit.
     */
    commit: FilesCommitInfo;
  }

  interface FilesUploadSessionFinishBatchArg {
    /**
     * Commit information for each file in the batch.
     */
    entries: Array<FilesUploadSessionFinishArg>;
  }

  /**
   * The :route:`upload_session/finish_batch` has finished.
   */
  interface FilesUploadSessionFinishBatchJobStatusComplete {
    '.tag': 'complete';
    complete: FilesUploadSessionFinishBatchResult;
  }

  type FilesUploadSessionFinishBatchJobStatus = AsyncPollResultBase | FilesUploadSessionFinishBatchJobStatusComplete;

  interface FilesUploadSessionFinishBatchResult {
    /**
     * Commit result for each file in the batch.
     */
    entries: Array<FilesUploadSessionFinishBatchResultEntry>;
  }

  interface FilesUploadSessionFinishBatchResultEntrySuccess {
    '.tag': 'success';
    success: FilesFileMetadata;
  }

  interface FilesUploadSessionFinishBatchResultEntryFailure {
    '.tag': 'failure';
    failure: FilesUploadSessionFinishError;
  }

  type FilesUploadSessionFinishBatchResultEntry = FilesUploadSessionFinishBatchResultEntrySuccess | FilesUploadSessionFinishBatchResultEntryFailure;

  /**
   * The session arguments are incorrect; the value explains the reason.
   */
  interface FilesUploadSessionFinishErrorLookupFailed {
    '.tag': 'lookup_failed';
    lookup_failed: FilesUploadSessionLookupError;
  }

  /**
   * Unable to save the uploaded contents to a file.
   */
  interface FilesUploadSessionFinishErrorPath {
    '.tag': 'path';
    path: FilesWriteError;
  }

  /**
   * The batch request commits files into too many different shared folders.
   * Please limit your batch request to files contained in a single shared
   * folder.
   */
  interface FilesUploadSessionFinishErrorTooManySharedFolderTargets {
    '.tag': 'too_many_shared_folder_targets';
  }

  interface FilesUploadSessionFinishErrorOther {
    '.tag': 'other';
  }

  type FilesUploadSessionFinishError = FilesUploadSessionFinishErrorLookupFailed | FilesUploadSessionFinishErrorPath | FilesUploadSessionFinishErrorTooManySharedFolderTargets | FilesUploadSessionFinishErrorOther;

  /**
   * The upload session id was not found.
   */
  interface FilesUploadSessionLookupErrorNotFound {
    '.tag': 'not_found';
  }

  /**
   * The specified offset was incorrect. See the value for the correct offset.
   * (This error may occur when a previous request was received and processed
   * successfully but the client did not receive the response, e.g. due to a
   * network error.)
   */
  interface FilesUploadSessionLookupErrorIncorrectOffset {
    '.tag': 'incorrect_offset';
    incorrect_offset: FilesUploadSessionOffsetError;
  }

  /**
   * You are attempting to append data to an upload session that has alread been
   * closed (i.e. committed).
   */
  interface FilesUploadSessionLookupErrorClosed {
    '.tag': 'closed';
  }

  /**
   * The session must be closed before calling upload_session/finish_batch.
   */
  interface FilesUploadSessionLookupErrorNotClosed {
    '.tag': 'not_closed';
  }

  interface FilesUploadSessionLookupErrorOther {
    '.tag': 'other';
  }

  type FilesUploadSessionLookupError = FilesUploadSessionLookupErrorNotFound | FilesUploadSessionLookupErrorIncorrectOffset | FilesUploadSessionLookupErrorClosed | FilesUploadSessionLookupErrorNotClosed | FilesUploadSessionLookupErrorOther;

  interface FilesUploadSessionOffsetError {
    /**
     * The offset up to which data has been collected.
     */
    correct_offset: number;
  }

  interface FilesUploadSessionStartArg {
    /**
     * The file contents to be uploaded.
     */
    contents: Object;
    /**
     * If true, the current session will be closed, at which point you won't be
     * able to call :route:`upload_session/append_v2` anymore with the current
     * session.
     */
    close: boolean;
  }

  interface FilesUploadSessionStartResult {
    /**
     * A unique identifier for the upload session. Pass this to
     * :route:`upload_session/append_v2` and :route:`upload_session/finish`.
     */
    session_id: string;
  }

  interface FilesUploadWriteFailed {
    /**
     * The reason why the file couldn't be saved.
     */
    reason: FilesWriteError;
    /**
     * The upload session ID; this may be used to retry the commit.
     */
    upload_session_id: string;
  }

  /**
   * Metadata for a video.
   */
  interface FilesVideoMetadata extends FilesMediaMetadata {
    /**
     * The duration of the video in milliseconds.
     */
    duration?: number;
  }

  /**
   * There's a file in the way.
   */
  interface FilesWriteConflictErrorFile {
    '.tag': 'file';
  }

  /**
   * There's a folder in the way.
   */
  interface FilesWriteConflictErrorFolder {
    '.tag': 'folder';
  }

  /**
   * There's a file at an ancestor path, so we couldn't create the required
   * parent folders.
   */
  interface FilesWriteConflictErrorFileAncestor {
    '.tag': 'file_ancestor';
  }

  interface FilesWriteConflictErrorOther {
    '.tag': 'other';
  }

  type FilesWriteConflictError = FilesWriteConflictErrorFile | FilesWriteConflictErrorFolder | FilesWriteConflictErrorFileAncestor | FilesWriteConflictErrorOther;

  interface FilesWriteErrorMalformedPath {
    '.tag': 'malformed_path';
    malformed_path: string;
  }

  /**
   * Couldn't write to the target path because there was something in the way.
   */
  interface FilesWriteErrorConflict {
    '.tag': 'conflict';
    conflict: FilesWriteConflictError;
  }

  /**
   * The user doesn't have permissions to write to the target location.
   */
  interface FilesWriteErrorNoWritePermission {
    '.tag': 'no_write_permission';
  }

  /**
   * The user doesn't have enough available space (bytes) to write more data.
   */
  interface FilesWriteErrorInsufficientSpace {
    '.tag': 'insufficient_space';
  }

  /**
   * Dropbox will not save the file or folder because of its name.
   */
  interface FilesWriteErrorDisallowedName {
    '.tag': 'disallowed_name';
  }

  interface FilesWriteErrorOther {
    '.tag': 'other';
  }

  type FilesWriteError = FilesWriteErrorMalformedPath | FilesWriteErrorConflict | FilesWriteErrorNoWritePermission | FilesWriteErrorInsufficientSpace | FilesWriteErrorDisallowedName | FilesWriteErrorOther;

  /**
   * Never overwrite the existing file. The autorename strategy is to append a
   * number to the file name. For example, "document.txt" might become "document
   * (2).txt".
   */
  interface FilesWriteModeAdd {
    '.tag': 'add';
  }

  /**
   * Always overwrite the existing file. The autorename strategy is the same as
   * it is for :field:`add`.
   */
  interface FilesWriteModeOverwrite {
    '.tag': 'overwrite';
  }

  /**
   * Overwrite if the given "rev" matches the existing file's "rev". The
   * autorename strategy is to append the string "conflicted copy" to the file
   * name. For example, "document.txt" might become "document (conflicted
   * copy).txt" or "document (Panda's conflicted copy).txt".
   */
  interface FilesWriteModeUpdate {
    '.tag': 'update';
    update: string;
  }

  /**
   * Your intent when writing a file to some path. This is used to determine
   * what constitutes a conflict and what the autorename strategy is. In some
   * situations, the conflict behavior is identical: (a) If the target path
   * doesn't contain anything, the file is always written; no conflict. (b) If
   * the target path contains a folder, it's always a conflict. (c) If the
   * target path contains a file with identical contents, nothing gets written;
   * no conflict. The conflict checking differs in the case where there's a file
   * at the target path with contents different from the contents you're trying
   * to write.
   */
  type FilesWriteMode = FilesWriteModeAdd | FilesWriteModeOverwrite | FilesWriteModeUpdate;

  interface PropertiesGetPropertyTemplateArg {
    /**
     * An identifier for property template added by route
     * properties/template/add.
     */
    template_id: string;
  }

  /**
   * The Property template for the specified template.
   */
  interface PropertiesGetPropertyTemplateResult extends PropertiesPropertyGroupTemplate {
  }

  interface PropertiesListPropertyTemplateIds {
    /**
     * List of identifiers for templates added by route properties/template/add.
     */
    template_ids: Array<Object>;
  }

  /**
   * A property field name already exists in the template.
   */
  interface PropertiesModifyPropertyTemplateErrorConflictingPropertyNames {
    '.tag': 'conflicting_property_names';
  }

  /**
   * There are too many properties in the changed template. The maximum number
   * of properties per template is 32.
   */
  interface PropertiesModifyPropertyTemplateErrorTooManyProperties {
    '.tag': 'too_many_properties';
  }

  /**
   * There are too many templates for the team.
   */
  interface PropertiesModifyPropertyTemplateErrorTooManyTemplates {
    '.tag': 'too_many_templates';
  }

  /**
   * The template name, description or field names is too large.
   */
  interface PropertiesModifyPropertyTemplateErrorTemplateAttributeTooLarge {
    '.tag': 'template_attribute_too_large';
  }

  type PropertiesModifyPropertyTemplateError = PropertiesPropertyTemplateError | PropertiesModifyPropertyTemplateErrorConflictingPropertyNames | PropertiesModifyPropertyTemplateErrorTooManyProperties | PropertiesModifyPropertyTemplateErrorTooManyTemplates | PropertiesModifyPropertyTemplateErrorTemplateAttributeTooLarge;

  interface PropertiesPropertyField {
    /**
     * This is the name or key of a custom property in a property template. File
     * property names can be up to 256 bytes.
     */
    name: string;
    /**
     * Value of a custom property attached to a file. Values can be up to 1024
     * bytes.
     */
    value: string;
  }

  /**
   * Describe a single property field type which that can be part of a property
   * template.
   */
  interface PropertiesPropertyFieldTemplate {
    /**
     * This is the name or key of a custom property in a property template. File
     * property names can be up to 256 bytes.
     */
    name: string;
    /**
     * This is the description for a custom property in a property template.
     * File property description can be up to 1024 bytes.
     */
    description: string;
    /**
     * This is the data type of the value of this property. This type will be
     * enforced upon property creation and modifications.
     */
    type: PropertiesPropertyType;
  }

  /**
   * Collection of custom properties in filled property templates.
   */
  interface PropertiesPropertyGroup {
    /**
     * A unique identifier for a property template type.
     */
    template_id: string;
    /**
     * This is a list of custom properties associated with a file. There can be
     * up to 32 properties for a template.
     */
    fields: Array<PropertiesPropertyField>;
  }

  /**
   * Describes property templates that can be filled and associated with a file.
   */
  interface PropertiesPropertyGroupTemplate {
    /**
     * A display name for the property template. Property template names can be
     * up to 256 bytes.
     */
    name: string;
    /**
     * Description for new property template. Property template descriptions can
     * be up to 1024 bytes.
     */
    description: string;
    /**
     * This is a list of custom properties associated with a property template.
     * There can be up to 64 properties in a single property template.
     */
    fields: Array<PropertiesPropertyFieldTemplate>;
  }

  /**
   * Property template does not exist for given identifier.
   */
  interface PropertiesPropertyTemplateErrorTemplateNotFound {
    '.tag': 'template_not_found';
    template_not_found: string;
  }

  /**
   * You do not have the permissions to modify this property template.
   */
  interface PropertiesPropertyTemplateErrorRestrictedContent {
    '.tag': 'restricted_content';
  }

  interface PropertiesPropertyTemplateErrorOther {
    '.tag': 'other';
  }

  type PropertiesPropertyTemplateError = PropertiesPropertyTemplateErrorTemplateNotFound | PropertiesPropertyTemplateErrorRestrictedContent | PropertiesPropertyTemplateErrorOther;

  /**
   * The associated property will be of type string. Unicode is supported.
   */
  interface PropertiesPropertyTypeString {
    '.tag': 'string';
  }

  interface PropertiesPropertyTypeOther {
    '.tag': 'other';
  }

  /**
   * Data type of the given property added. This endpoint is in beta and  only
   * properties of type strings is supported.
   */
  type PropertiesPropertyType = PropertiesPropertyTypeString | PropertiesPropertyTypeOther;

  /**
   * The collaborator is the owner of the shared folder. Owners can view and
   * edit the shared folder as well as set the folder's policies using
   * :route:`update_folder_policy`.
   */
  interface SharingAccessLevelOwner {
    '.tag': 'owner';
  }

  /**
   * The collaborator can both view and edit the shared folder.
   */
  interface SharingAccessLevelEditor {
    '.tag': 'editor';
  }

  /**
   * The collaborator can only view the shared folder.
   */
  interface SharingAccessLevelViewer {
    '.tag': 'viewer';
  }

  /**
   * The collaborator can only view the shared folder and does not have any
   * access to comments.
   */
  interface SharingAccessLevelViewerNoComment {
    '.tag': 'viewer_no_comment';
  }

  interface SharingAccessLevelOther {
    '.tag': 'other';
  }

  /**
   * Defines the access levels for collaborators.
   */
  type SharingAccessLevel = SharingAccessLevelOwner | SharingAccessLevelEditor | SharingAccessLevelViewer | SharingAccessLevelViewerNoComment | SharingAccessLevelOther;

  /**
   * Only the owner can update the ACL.
   */
  interface SharingAclUpdatePolicyOwner {
    '.tag': 'owner';
  }

  /**
   * Any editor can update the ACL. This may be further restricted to editors on
   * the same team.
   */
  interface SharingAclUpdatePolicyEditors {
    '.tag': 'editors';
  }

  interface SharingAclUpdatePolicyOther {
    '.tag': 'other';
  }

  /**
   * Policy governing who can change a shared folder's access control list
   * (ACL). In other words, who can add, remove, or change the privileges of
   * members.
   */
  type SharingAclUpdatePolicy = SharingAclUpdatePolicyOwner | SharingAclUpdatePolicyEditors | SharingAclUpdatePolicyOther;

  /**
   * Arguments for :route:`add_file_member`.
   */
  interface SharingAddFileMemberArgs {
    /**
     * File to which to add members.
     */
    file: string;
    /**
     * Members to add. Note that even an email address is given, this may result
     * in a user being directy added to the membership if that email is the
     * user's main account email.
     */
    members: Array<SharingMemberSelector>;
    /**
     * Message to send to added members in their invitation.
     */
    custom_message?: string;
    /**
     * Whether added members should be notified via device notifications of
     * their invitation.
     */
    quiet: boolean;
    /**
     * AccessLevel union object, describing what access level we want to give
     * new members.
     */
    access_level: SharingAccessLevel;
    /**
     * If the custom message should be added as a comment on the file.
     */
    add_message_as_comment: boolean;
  }

  interface SharingAddFileMemberErrorUserError {
    '.tag': 'user_error';
    user_error: SharingSharingUserError;
  }

  interface SharingAddFileMemberErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharingFileAccessError;
  }

  /**
   * The user has reached the rate limit for invitations.
   */
  interface SharingAddFileMemberErrorRateLimit {
    '.tag': 'rate_limit';
  }

  /**
   * The custom message did not pass comment permissions checks.
   */
  interface SharingAddFileMemberErrorInvalidComment {
    '.tag': 'invalid_comment';
  }

  interface SharingAddFileMemberErrorOther {
    '.tag': 'other';
  }

  /**
   * Errors for :route:`add_file_member`.
   */
  type SharingAddFileMemberError = SharingAddFileMemberErrorUserError | SharingAddFileMemberErrorAccessError | SharingAddFileMemberErrorRateLimit | SharingAddFileMemberErrorInvalidComment | SharingAddFileMemberErrorOther;

  interface SharingAddFolderMemberArg {
    /**
     * The ID for the shared folder.
     */
    shared_folder_id: string;
    /**
     * The intended list of members to add.  Added members will receive invites
     * to join the shared folder.
     */
    members: Array<SharingAddMember>;
    /**
     * Whether added members should be notified via email and device
     * notifications of their invite.
     */
    quiet: boolean;
    /**
     * Optional message to display to added members in their invitation.
     */
    custom_message?: string;
  }

  /**
   * Unable to access shared folder.
   */
  interface SharingAddFolderMemberErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharedFolderAccessError;
  }

  /**
   * The current user's e-mail address is unverified.
   */
  interface SharingAddFolderMemberErrorEmailUnverified {
    '.tag': 'email_unverified';
  }

  /**
   * :field:`AddFolderMemberArg.members` contains a bad invitation recipient.
   */
  interface SharingAddFolderMemberErrorBadMember {
    '.tag': 'bad_member';
    bad_member: SharingAddMemberSelectorError;
  }

  /**
   * Your team policy does not allow sharing outside of the team.
   */
  interface SharingAddFolderMemberErrorCantShareOutsideTeam {
    '.tag': 'cant_share_outside_team';
  }

  /**
   * The value is the member limit that was reached.
   */
  interface SharingAddFolderMemberErrorTooManyMembers {
    '.tag': 'too_many_members';
    too_many_members: number;
  }

  /**
   * The value is the pending invite limit that was reached.
   */
  interface SharingAddFolderMemberErrorTooManyPendingInvites {
    '.tag': 'too_many_pending_invites';
    too_many_pending_invites: number;
  }

  /**
   * The current user has hit the limit of invites they can send per day. Try
   * again in 24 hours.
   */
  interface SharingAddFolderMemberErrorRateLimit {
    '.tag': 'rate_limit';
  }

  /**
   * The current user is trying to share with too many people at once.
   */
  interface SharingAddFolderMemberErrorTooManyInvitees {
    '.tag': 'too_many_invitees';
  }

  /**
   * The current user's account doesn't support this action. An example of this
   * is when adding a read-only member. This action can only be performed by
   * users that have upgraded to a Pro or Business plan.
   */
  interface SharingAddFolderMemberErrorInsufficientPlan {
    '.tag': 'insufficient_plan';
  }

  /**
   * This action cannot be performed on a team shared folder.
   */
  interface SharingAddFolderMemberErrorTeamFolder {
    '.tag': 'team_folder';
  }

  /**
   * The current user does not have permission to perform this action.
   */
  interface SharingAddFolderMemberErrorNoPermission {
    '.tag': 'no_permission';
  }

  interface SharingAddFolderMemberErrorOther {
    '.tag': 'other';
  }

  type SharingAddFolderMemberError = SharingAddFolderMemberErrorAccessError | SharingAddFolderMemberErrorEmailUnverified | SharingAddFolderMemberErrorBadMember | SharingAddFolderMemberErrorCantShareOutsideTeam | SharingAddFolderMemberErrorTooManyMembers | SharingAddFolderMemberErrorTooManyPendingInvites | SharingAddFolderMemberErrorRateLimit | SharingAddFolderMemberErrorTooManyInvitees | SharingAddFolderMemberErrorInsufficientPlan | SharingAddFolderMemberErrorTeamFolder | SharingAddFolderMemberErrorNoPermission | SharingAddFolderMemberErrorOther;

  /**
   * The member and type of access the member should have when added to a shared
   * folder.
   */
  interface SharingAddMember {
    /**
     * The member to add to the shared folder.
     */
    member: SharingMemberSelector;
    /**
     * The access level to grant :field:`member` to the shared folder.
     * :field:`AccessLevel.owner` is disallowed.
     */
    access_level: SharingAccessLevel;
  }

  /**
   * Automatically created groups can only be added to team folders.
   */
  interface SharingAddMemberSelectorErrorAutomaticGroup {
    '.tag': 'automatic_group';
  }

  /**
   * The value is the ID that could not be identified.
   */
  interface SharingAddMemberSelectorErrorInvalidDropboxId {
    '.tag': 'invalid_dropbox_id';
    invalid_dropbox_id: string;
  }

  /**
   * The value is the e-email address that is malformed.
   */
  interface SharingAddMemberSelectorErrorInvalidEmail {
    '.tag': 'invalid_email';
    invalid_email: string;
  }

  /**
   * The value is the ID of the Dropbox user with an unverified e-mail address.
   * Invite unverified users by e-mail address instead of by their Dropbox ID.
   */
  interface SharingAddMemberSelectorErrorUnverifiedDropboxId {
    '.tag': 'unverified_dropbox_id';
    unverified_dropbox_id: string;
  }

  /**
   * At least one of the specified groups in :field:`AddFolderMemberArg.members`
   * is deleted.
   */
  interface SharingAddMemberSelectorErrorGroupDeleted {
    '.tag': 'group_deleted';
  }

  /**
   * Sharing to a group that is not on the current user's team.
   */
  interface SharingAddMemberSelectorErrorGroupNotOnTeam {
    '.tag': 'group_not_on_team';
  }

  interface SharingAddMemberSelectorErrorOther {
    '.tag': 'other';
  }

  type SharingAddMemberSelectorError = SharingAddMemberSelectorErrorAutomaticGroup | SharingAddMemberSelectorErrorInvalidDropboxId | SharingAddMemberSelectorErrorInvalidEmail | SharingAddMemberSelectorErrorUnverifiedDropboxId | SharingAddMemberSelectorErrorGroupDeleted | SharingAddMemberSelectorErrorGroupNotOnTeam | SharingAddMemberSelectorErrorOther;

  /**
   * Arguments for :route:`change_file_member_access`.
   */
  interface SharingChangeFileMemberAccessArgs {
    /**
     * File for which we are changing a member's access.
     */
    file: string;
    /**
     * The member whose access we are changing.
     */
    member: SharingMemberSelector;
    /**
     * The new access level for the member.
     */
    access_level: SharingAccessLevel;
  }

  /**
   * Metadata for a collection-based shared link.
   */
  interface SharingCollectionLinkMetadata extends SharingLinkMetadata {
  }

  interface SharingCreateSharedLinkArg {
    /**
     * The path to share.
     */
    path: string;
    /**
     * Whether to return a shortened URL.
     */
    short_url: boolean;
    /**
     * If it's okay to share a path that does not yet exist, set this to either
     * :field:`PendingUploadMode.file` or :field:`PendingUploadMode.folder` to
     * indicate whether to assume it's a file or folder.
     */
    pending_upload?: SharingPendingUploadMode;
  }

  interface SharingCreateSharedLinkErrorPath {
    '.tag': 'path';
    path: FilesLookupError;
  }

  interface SharingCreateSharedLinkErrorOther {
    '.tag': 'other';
  }

  type SharingCreateSharedLinkError = SharingCreateSharedLinkErrorPath | SharingCreateSharedLinkErrorOther;

  interface SharingCreateSharedLinkWithSettingsArg {
    /**
     * The path to be shared by the shared link
     */
    path: string;
    /**
     * The requested settings for the newly created shared link
     */
    settings?: SharingSharedLinkSettings;
  }

  interface SharingCreateSharedLinkWithSettingsErrorPath {
    '.tag': 'path';
    path: FilesLookupError;
  }

  /**
   * User's email should be verified
   */
  interface SharingCreateSharedLinkWithSettingsErrorEmailNotVerified {
    '.tag': 'email_not_verified';
  }

  /**
   * The shared link already exists
   */
  interface SharingCreateSharedLinkWithSettingsErrorSharedLinkAlreadyExists {
    '.tag': 'shared_link_already_exists';
  }

  /**
   * There is an error with the given settings
   */
  interface SharingCreateSharedLinkWithSettingsErrorSettingsError {
    '.tag': 'settings_error';
    settings_error: SharingSharedLinkSettingsError;
  }

  /**
   * Access to the requested path is forbidden
   */
  interface SharingCreateSharedLinkWithSettingsErrorAccessDenied {
    '.tag': 'access_denied';
  }

  type SharingCreateSharedLinkWithSettingsError = SharingCreateSharedLinkWithSettingsErrorPath | SharingCreateSharedLinkWithSettingsErrorEmailNotVerified | SharingCreateSharedLinkWithSettingsErrorSharedLinkAlreadyExists | SharingCreateSharedLinkWithSettingsErrorSettingsError | SharingCreateSharedLinkWithSettingsErrorAccessDenied;

  /**
   * Change or edit contents of the file.
   */
  interface SharingFileActionEditContents {
    '.tag': 'edit_contents';
  }

  /**
   * Add a member with view permissions.
   */
  interface SharingFileActionInviteViewer {
    '.tag': 'invite_viewer';
  }

  /**
   * Add a member with view permissions but no comment permissions.
   */
  interface SharingFileActionInviteViewerNoComment {
    '.tag': 'invite_viewer_no_comment';
  }

  /**
   * Stop sharing this file.
   */
  interface SharingFileActionUnshare {
    '.tag': 'unshare';
  }

  /**
   * Relinquish one's own membership to the file.
   */
  interface SharingFileActionRelinquishMembership {
    '.tag': 'relinquish_membership';
  }

  /**
   * This action is deprecated. Use create_link instead.
   */
  interface SharingFileActionShareLink {
    '.tag': 'share_link';
  }

  /**
   * Create a shared link to the file.
   */
  interface SharingFileActionCreateLink {
    '.tag': 'create_link';
  }

  interface SharingFileActionOther {
    '.tag': 'other';
  }

  /**
   * Sharing actions that may be taken on files.
   */
  type SharingFileAction = SharingFileActionEditContents | SharingFileActionInviteViewer | SharingFileActionInviteViewerNoComment | SharingFileActionUnshare | SharingFileActionRelinquishMembership | SharingFileActionShareLink | SharingFileActionCreateLink | SharingFileActionOther;

  /**
   * File specified by id was not found.
   */
  interface SharingFileErrorResultFileNotFoundError {
    '.tag': 'file_not_found_error';
    file_not_found_error: string;
  }

  /**
   * User does not have permission to take the specified action on the file.
   */
  interface SharingFileErrorResultInvalidFileActionError {
    '.tag': 'invalid_file_action_error';
    invalid_file_action_error: string;
  }

  /**
   * User does not have permission to access file specified by file.Id.
   */
  interface SharingFileErrorResultPermissionDeniedError {
    '.tag': 'permission_denied_error';
    permission_denied_error: string;
  }

  interface SharingFileErrorResultOther {
    '.tag': 'other';
  }

  type SharingFileErrorResult = SharingFileErrorResultFileNotFoundError | SharingFileErrorResultInvalidFileActionError | SharingFileErrorResultPermissionDeniedError | SharingFileErrorResultOther;

  /**
   * The metadata of a file shared link
   */
  interface SharingFileLinkMetadata extends SharingSharedLinkMetadata {
    /**
     * The modification time set by the desktop client when the file was added
     * to Dropbox. Since this time is not verified (the Dropbox server stores
     * whatever the desktop client sends up), this should only be used for
     * display purposes (such as sorting) and not, for example, to determine if
     * a file has changed or not.
     */
    client_modified: Timestamp;
    /**
     * The last time the file was modified on Dropbox.
     */
    server_modified: Timestamp;
    /**
     * A unique identifier for the current revision of a file. This field is the
     * same rev as elsewhere in the API and can be used to detect changes and
     * avoid conflicts.
     */
    rev: string;
    /**
     * The file size in bytes.
     */
    size: number;
  }

  /**
   * Specified member was not found.
   */
  interface SharingFileMemberActionErrorInvalidMember {
    '.tag': 'invalid_member';
  }

  /**
   * User does not have permission to perform this action on this member.
   */
  interface SharingFileMemberActionErrorNoPermission {
    '.tag': 'no_permission';
  }

  /**
   * Specified file was invalid or user does not have access.
   */
  interface SharingFileMemberActionErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharingFileAccessError;
  }

  interface SharingFileMemberActionErrorOther {
    '.tag': 'other';
  }

  type SharingFileMemberActionError = SharingFileMemberActionErrorInvalidMember | SharingFileMemberActionErrorNoPermission | SharingFileMemberActionErrorAccessError | SharingFileMemberActionErrorOther;

  /**
   * Member was successfully removed from this file. If AccessLevel is given,
   * the member still has access via a parent shared folder.
   */
  interface SharingFileMemberActionIndividualResultSuccess {
    '.tag': 'success';
    success: SharingAccessLevel;
  }

  /**
   * User was not able to perform this action.
   */
  interface SharingFileMemberActionIndividualResultMemberError {
    '.tag': 'member_error';
    member_error: SharingFileMemberActionError;
  }

  type SharingFileMemberActionIndividualResult = SharingFileMemberActionIndividualResultSuccess | SharingFileMemberActionIndividualResultMemberError;

  /**
   * Per-member result for :route:`remove_file_member_2` or
   * :route:`add_file_member` or :route:`change_file_member_access`.
   */
  interface SharingFileMemberActionResult {
    /**
     * One of specified input members.
     */
    member: SharingMemberSelector;
    /**
     * The outcome of the action on this member.
     */
    result: SharingFileMemberActionIndividualResult;
  }

  /**
   * Member was successfully removed from this file.
   */
  interface SharingFileMemberRemoveActionResultSuccess {
    '.tag': 'success';
    success: SharingMemberAccessLevelResult;
  }

  /**
   * User was not able to remove this member.
   */
  interface SharingFileMemberRemoveActionResultMemberError {
    '.tag': 'member_error';
    member_error: SharingFileMemberActionError;
  }

  interface SharingFileMemberRemoveActionResultOther {
    '.tag': 'other';
  }

  type SharingFileMemberRemoveActionResult = SharingFileMemberRemoveActionResultSuccess | SharingFileMemberRemoveActionResultMemberError | SharingFileMemberRemoveActionResultOther;

  /**
   * Whether the user is allowed to take the sharing action on the file.
   */
  interface SharingFilePermission {
    /**
     * The action that the user may wish to take on the file.
     */
    action: SharingFileAction;
    /**
     * True if the user is allowed to take the action.
     */
    allow: boolean;
    /**
     * The reason why the user is denied the permission. Not present if the
     * action is allowed
     */
    reason?: SharingPermissionDeniedReason;
  }

  /**
   * Change folder options, such as who can be invited to join the folder.
   */
  interface SharingFolderActionChangeOptions {
    '.tag': 'change_options';
  }

  /**
   * Change or edit contents of the folder.
   */
  interface SharingFolderActionEditContents {
    '.tag': 'edit_contents';
  }

  /**
   * Invite a user or group to join the folder with read and write permission.
   */
  interface SharingFolderActionInviteEditor {
    '.tag': 'invite_editor';
  }

  /**
   * Invite a user or group to join the folder with read permission.
   */
  interface SharingFolderActionInviteViewer {
    '.tag': 'invite_viewer';
  }

  /**
   * Invite a user or group to join the folder with read permission but no
   * comment permissions.
   */
  interface SharingFolderActionInviteViewerNoComment {
    '.tag': 'invite_viewer_no_comment';
  }

  /**
   * Relinquish one's own membership in the folder.
   */
  interface SharingFolderActionRelinquishMembership {
    '.tag': 'relinquish_membership';
  }

  /**
   * Unmount the folder.
   */
  interface SharingFolderActionUnmount {
    '.tag': 'unmount';
  }

  /**
   * Stop sharing this folder.
   */
  interface SharingFolderActionUnshare {
    '.tag': 'unshare';
  }

  /**
   * Keep a copy of the contents upon leaving or being kicked from the folder.
   */
  interface SharingFolderActionLeaveACopy {
    '.tag': 'leave_a_copy';
  }

  /**
   * This action is deprecated. Use create_link instead.
   */
  interface SharingFolderActionShareLink {
    '.tag': 'share_link';
  }

  /**
   * Create a shared link for folder.
   */
  interface SharingFolderActionCreateLink {
    '.tag': 'create_link';
  }

  interface SharingFolderActionOther {
    '.tag': 'other';
  }

  /**
   * Actions that may be taken on shared folders.
   */
  type SharingFolderAction = SharingFolderActionChangeOptions | SharingFolderActionEditContents | SharingFolderActionInviteEditor | SharingFolderActionInviteViewer | SharingFolderActionInviteViewerNoComment | SharingFolderActionRelinquishMembership | SharingFolderActionUnmount | SharingFolderActionUnshare | SharingFolderActionLeaveACopy | SharingFolderActionShareLink | SharingFolderActionCreateLink | SharingFolderActionOther;

  /**
   * The metadata of a folder shared link
   */
  interface SharingFolderLinkMetadata extends SharingSharedLinkMetadata {
  }

  /**
   * Whether the user is allowed to take the action on the shared folder.
   */
  interface SharingFolderPermission {
    /**
     * The action that the user may wish to take on the folder.
     */
    action: SharingFolderAction;
    /**
     * True if the user is allowed to take the action.
     */
    allow: boolean;
    /**
     * The reason why the user is denied the permission. Not present if the
     * action is allowed, or if no reason is available.
     */
    reason?: SharingPermissionDeniedReason;
  }

  /**
   * A set of policies governing membership and privileges for a shared folder.
   */
  interface SharingFolderPolicy {
    /**
     * Who can be a member of this shared folder, as set on the folder itself.
     * The effective policy may differ from this value if the team-wide policy
     * is more restrictive. Present only if the folder is owned by a team.
     */
    member_policy?: SharingMemberPolicy;
    /**
     * Who can be a member of this shared folder, taking into account both the
     * folder and the team-wide policy. This value may differ from that of
     * member_policy if the team-wide policy is more restrictive than the folder
     * policy. Present only if the folder is owned by a team.
     */
    resolved_member_policy?: SharingMemberPolicy;
    /**
     * Who can add and remove members from this shared folder.
     */
    acl_update_policy: SharingAclUpdatePolicy;
    /**
     * Who links can be shared with.
     */
    shared_link_policy: SharingSharedLinkPolicy;
  }

  /**
   * Arguments of :route:`get_file_metadata`
   */
  interface SharingGetFileMetadataArg {
    /**
     * The file to query.
     */
    file: string;
    /**
     * File actions to query.
     */
    actions?: Array<SharingFileAction>;
  }

  /**
   * Arguments of :route:`get_file_metadata/batch`
   */
  interface SharingGetFileMetadataBatchArg {
    /**
     * The files to query.
     */
    files: Array<Object>;
    /**
     * File actions to query.
     */
    actions?: Array<SharingFileAction>;
  }

  /**
   * Per file results of :route:`get_file_metadata/batch`
   */
  interface SharingGetFileMetadataBatchResult {
    /**
     * This is the input file identifier corresponding to one of
     * :field:`GetFileMetadataBatchArg.files`.
     */
    file: string;
    /**
     * The result for this particular file
     */
    result: SharingGetFileMetadataIndividualResult;
  }

  interface SharingGetFileMetadataErrorUserError {
    '.tag': 'user_error';
    user_error: SharingSharingUserError;
  }

  interface SharingGetFileMetadataErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharingFileAccessError;
  }

  interface SharingGetFileMetadataErrorOther {
    '.tag': 'other';
  }

  /**
   * Error result for :route:`get_file_metadata`.
   */
  type SharingGetFileMetadataError = SharingGetFileMetadataErrorUserError | SharingGetFileMetadataErrorAccessError | SharingGetFileMetadataErrorOther;

  /**
   * The result for this file if it was successful.
   */
  interface SharingGetFileMetadataIndividualResultMetadata {
    '.tag': 'metadata';
    metadata: SharingSharedFileMetadata;
  }

  /**
   * The result for this file if it was an error.
   */
  interface SharingGetFileMetadataIndividualResultAccessError {
    '.tag': 'access_error';
    access_error: SharingSharingFileAccessError;
  }

  interface SharingGetFileMetadataIndividualResultOther {
    '.tag': 'other';
  }

  type SharingGetFileMetadataIndividualResult = SharingGetFileMetadataIndividualResultMetadata | SharingGetFileMetadataIndividualResultAccessError | SharingGetFileMetadataIndividualResultOther;

  interface SharingGetMetadataArgs {
    /**
     * The ID for the shared folder.
     */
    shared_folder_id: string;
    /**
     * This is a list indicating whether the returned folder data will include a
     * boolean value  :field:`FolderPermission.allow` that describes whether the
     * current user can perform the  FolderAction on the folder.
     */
    actions?: Array<SharingFolderAction>;
  }

  /**
   * Directories cannot be retrieved by this endpoint.
   */
  interface SharingGetSharedLinkFileErrorSharedLinkIsDirectory {
    '.tag': 'shared_link_is_directory';
  }

  type SharingGetSharedLinkFileError = SharingSharedLinkError | SharingGetSharedLinkFileErrorSharedLinkIsDirectory;

  interface SharingGetSharedLinkMetadataArg {
    /**
     * URL of the shared link.
     */
    url: string;
    /**
     * If the shared link is to a folder, this parameter can be used to retrieve
     * the metadata for a specific file or sub-folder in this folder. A relative
     * path should be used.
     */
    path?: string;
    /**
     * If the shared link has a password, this parameter can be used.
     */
    link_password?: string;
  }

  interface SharingGetSharedLinksArg {
    /**
     * See :route:`get_shared_links` description.
     */
    path?: string;
  }

  interface SharingGetSharedLinksErrorPath {
    '.tag': 'path';
    path: string;
  }

  interface SharingGetSharedLinksErrorOther {
    '.tag': 'other';
  }

  type SharingGetSharedLinksError = SharingGetSharedLinksErrorPath | SharingGetSharedLinksErrorOther;

  interface SharingGetSharedLinksResult {
    /**
     * Shared links applicable to the path argument.
     */
    links: Array<SharingLinkMetadata>;
  }

  /**
   * The information about a group. Groups is a way to manage a list of users
   * who need same access permission to the shared folder.
   */
  interface SharingGroupInfo extends Team_commonGroupSummary {
    /**
     * The type of group.
     */
    group_type: Team_commonGroupType;
    /**
     * If the current user is an owner of the group.
     */
    is_owner: boolean;
    /**
     * If the group is owned by the current user's team.
     */
    same_team: boolean;
  }

  /**
   * The information about a group member of the shared content.
   */
  interface SharingGroupMembershipInfo extends SharingMembershipInfo {
    /**
     * The information about the membership group.
     */
    group: SharingGroupInfo;
  }

  interface SharingInsufficientQuotaAmounts {
    /**
     * The amount of space needed to add the item (the size of the item).
     */
    space_needed: number;
    /**
     * The amount of extra space needed to add the item.
     */
    space_shortage: number;
    /**
     * The amount of space left in the user's Dropbox, less than space_needed.
     */
    space_left: number;
  }

  /**
   * E-mail address of invited user.
   */
  interface SharingInviteeInfoEmail {
    '.tag': 'email';
    email: string;
  }

  interface SharingInviteeInfoOther {
    '.tag': 'other';
  }

  /**
   * Information about the recipient of a shared content invitation.
   */
  type SharingInviteeInfo = SharingInviteeInfoEmail | SharingInviteeInfoOther;

  /**
   * Information about an invited member of a shared content.
   */
  interface SharingInviteeMembershipInfo extends SharingMembershipInfo {
    /**
     * Recipient of the invitation.
     */
    invitee: SharingInviteeInfo;
    /**
     * The user this invitation is tied to, if available.
     */
    user?: SharingUserInfo;
  }

  /**
   * Error occurred while performing :route:`unshare_folder` action.
   */
  interface SharingJobErrorUnshareFolderError {
    '.tag': 'unshare_folder_error';
    unshare_folder_error: SharingUnshareFolderError;
  }

  /**
   * Error occurred while performing :route:`remove_folder_member` action.
   */
  interface SharingJobErrorRemoveFolderMemberError {
    '.tag': 'remove_folder_member_error';
    remove_folder_member_error: SharingRemoveFolderMemberError;
  }

  /**
   * Error occurred while performing :route:`relinquish_folder_membership`
   * action.
   */
  interface SharingJobErrorRelinquishFolderMembershipError {
    '.tag': 'relinquish_folder_membership_error';
    relinquish_folder_membership_error: SharingRelinquishFolderMembershipError;
  }

  interface SharingJobErrorOther {
    '.tag': 'other';
  }

  /**
   * Error occurred while performing an asynchronous job from
   * :route:`unshare_folder` or :route:`remove_folder_member`.
   */
  type SharingJobError = SharingJobErrorUnshareFolderError | SharingJobErrorRemoveFolderMemberError | SharingJobErrorRelinquishFolderMembershipError | SharingJobErrorOther;

  /**
   * The asynchronous job has finished.
   */
  interface SharingJobStatusComplete {
    '.tag': 'complete';
  }

  /**
   * The asynchronous job returned an error.
   */
  interface SharingJobStatusFailed {
    '.tag': 'failed';
    failed: SharingJobError;
  }

  type SharingJobStatus = AsyncPollResultBase | SharingJobStatusComplete | SharingJobStatusFailed;

  /**
   * Metadata for a shared link. This can be either a :type:`PathLinkMetadata`
   * or :type:`CollectionLinkMetadata`.
   */
  interface SharingLinkMetadata {
    /**
     * URL of the shared link.
     */
    url: string;
    /**
     * Who can access the link.
     */
    visibility: SharingVisibility;
    /**
     * Expiration time, if set. By default the link won't expire.
     */
    expires?: Timestamp;
  }

  interface SharingLinkPermissions {
    /**
     * The current visibility of the link after considering the shared links
     * policies of the the team (in case the link's owner is part of a team) and
     * the shared folder (in case the linked file is part of a shared folder).
     * This field is shown only if the caller has access to this info (the
     * link's owner always has access to this data).
     */
    resolved_visibility?: SharingResolvedVisibility;
    /**
     * The shared link's requested visibility. This can be overridden by the
     * team and shared folder policies. The final visibility, after considering
     * these policies, can be found in :field:`resolved_visibility`. This is
     * shown only if the caller is the link's owner.
     */
    requested_visibility?: SharingRequestedVisibility;
    /**
     * Whether the caller can revoke the shared link
     */
    can_revoke: boolean;
    /**
     * The failure reason for revoking the link. This field will only be present
     * if the :field:`can_revoke` is :val:`false`.
     */
    revoke_failure_reason?: SharingSharedLinkAccessFailureReason;
  }

  /**
   * Arguments for :route:`list_file_members`.
   */
  interface SharingListFileMembersArg {
    /**
     * The file for which you want to see members.
     */
    file: string;
    /**
     * The actions for which to return permissions on a member
     */
    actions?: Array<SharingMemberAction>;
    /**
     * Whether to include members who only have access from a parent shared
     * folder.
     */
    include_inherited: boolean;
    /**
     * Number of members to return max per query. Defaults to 100 if no limit is
     * specified.
     */
    limit: number;
  }

  /**
   * Arguments for :route:`list_file_members/batch`.
   */
  interface SharingListFileMembersBatchArg {
    /**
     * Files for which to return members.
     */
    files: Array<Object>;
    /**
     * Number of members to return max per query. Defaults to 10 if no limit is
     * specified.
     */
    limit: number;
  }

  /**
   * Per-file result for :route:`list_file_members/batch`.
   */
  interface SharingListFileMembersBatchResult {
    /**
     * This is the input file identifier, whether an ID or a path.
     */
    file: string;
    /**
     * The result for this particular file
     */
    result: SharingListFileMembersIndividualResult;
  }

  /**
   * Arguments for :route:`list_file_members/continue`.
   */
  interface SharingListFileMembersContinueArg {
    /**
     * The cursor returned by your last call to :route:`list_file_members`,
     * :route:`list_file_members/continue`, or :route:`list_file_members/batch`.
     */
    cursor: string;
  }

  interface SharingListFileMembersContinueErrorUserError {
    '.tag': 'user_error';
    user_error: SharingSharingUserError;
  }

  interface SharingListFileMembersContinueErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharingFileAccessError;
  }

  /**
   * :field:`ListFileMembersContinueArg.cursor` is invalid.
   */
  interface SharingListFileMembersContinueErrorInvalidCursor {
    '.tag': 'invalid_cursor';
  }

  interface SharingListFileMembersContinueErrorOther {
    '.tag': 'other';
  }

  /**
   * Error for :route:`list_file_members/continue`.
   */
  type SharingListFileMembersContinueError = SharingListFileMembersContinueErrorUserError | SharingListFileMembersContinueErrorAccessError | SharingListFileMembersContinueErrorInvalidCursor | SharingListFileMembersContinueErrorOther;

  interface SharingListFileMembersCountResult {
    /**
     * A list of members on this file.
     */
    members: SharingSharedFileMembers;
    /**
     * The number of members on this file. This does not include inherited
     * members
     */
    member_count: number;
  }

  interface SharingListFileMembersErrorUserError {
    '.tag': 'user_error';
    user_error: SharingSharingUserError;
  }

  interface SharingListFileMembersErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharingFileAccessError;
  }

  interface SharingListFileMembersErrorOther {
    '.tag': 'other';
  }

  /**
   * Error for :route:`list_file_members`.
   */
  type SharingListFileMembersError = SharingListFileMembersErrorUserError | SharingListFileMembersErrorAccessError | SharingListFileMembersErrorOther;

  /**
   * The results of the query for this file if it was successful
   */
  interface SharingListFileMembersIndividualResultResult {
    '.tag': 'result';
    result: SharingListFileMembersCountResult;
  }

  /**
   * The result of the query for this file if it was an error.
   */
  interface SharingListFileMembersIndividualResultAccessError {
    '.tag': 'access_error';
    access_error: SharingSharingFileAccessError;
  }

  interface SharingListFileMembersIndividualResultOther {
    '.tag': 'other';
  }

  type SharingListFileMembersIndividualResult = SharingListFileMembersIndividualResultResult | SharingListFileMembersIndividualResultAccessError | SharingListFileMembersIndividualResultOther;

  /**
   * Arguments for :route:`list_received_files`.
   */
  interface SharingListFilesArg {
    /**
     * Number of files to return max per query. Defaults to 100 if no limit is
     * specified.
     */
    limit: number;
    /**
     * File actions to query.
     */
    actions?: Array<SharingFileAction>;
  }

  /**
   * Arguments for :route:`list_received_files/continue`.
   */
  interface SharingListFilesContinueArg {
    /**
     * Cursor in :field:`ListFilesResult.cursor`
     */
    cursor: string;
  }

  /**
   * User account had a problem.
   */
  interface SharingListFilesContinueErrorUserError {
    '.tag': 'user_error';
    user_error: SharingSharingUserError;
  }

  /**
   * :field:`ListFilesContinueArg.cursor` is invalid.
   */
  interface SharingListFilesContinueErrorInvalidCursor {
    '.tag': 'invalid_cursor';
  }

  interface SharingListFilesContinueErrorOther {
    '.tag': 'other';
  }

  /**
   * Error results for :route:`list_received_files/continue`.
   */
  type SharingListFilesContinueError = SharingListFilesContinueErrorUserError | SharingListFilesContinueErrorInvalidCursor | SharingListFilesContinueErrorOther;

  /**
   * Success results for :route:`list_received_files`.
   */
  interface SharingListFilesResult {
    /**
     * Information about the files shared with current user.
     */
    entries: Array<SharingSharedFileMetadata>;
    /**
     * Cursor used to obtain additional shared files.
     */
    cursor?: string;
  }

  interface SharingListFolderMembersArgs extends SharingListFolderMembersCursorArg {
    /**
     * The ID for the shared folder.
     */
    shared_folder_id: string;
  }

  interface SharingListFolderMembersContinueArg {
    /**
     * The cursor returned by your last call to :route:`list_folder_members` or
     * :route:`list_folder_members/continue`.
     */
    cursor: string;
  }

  interface SharingListFolderMembersContinueErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharedFolderAccessError;
  }

  /**
   * :field:`ListFolderMembersContinueArg.cursor` is invalid.
   */
  interface SharingListFolderMembersContinueErrorInvalidCursor {
    '.tag': 'invalid_cursor';
  }

  interface SharingListFolderMembersContinueErrorOther {
    '.tag': 'other';
  }

  type SharingListFolderMembersContinueError = SharingListFolderMembersContinueErrorAccessError | SharingListFolderMembersContinueErrorInvalidCursor | SharingListFolderMembersContinueErrorOther;

  interface SharingListFolderMembersCursorArg {
    /**
     * This is a list indicating whether each returned member will include a
     * boolean value :field:`MemberPermission.allow` that describes whether the
     * current user can perform the MemberAction on the member.
     */
    actions?: Array<SharingMemberAction>;
    /**
     * The maximum number of results that include members, groups and invitees
     * to return per request.
     */
    limit: number;
  }

  interface SharingListFoldersArgs {
    /**
     * The maximum number of results to return per request.
     */
    limit: number;
    /**
     * This is a list indicating whether each returned folder data entry will
     * include a boolean field :field:`FolderPermission.allow` that describes
     * whether the current user can perform the `FolderAction` on the folder.
     */
    actions?: Array<SharingFolderAction>;
  }

  interface SharingListFoldersContinueArg {
    /**
     * The cursor returned by the previous API call specified in the endpoint
     * description.
     */
    cursor: string;
  }

  /**
   * :field:`ListFoldersContinueArg.cursor` is invalid.
   */
  interface SharingListFoldersContinueErrorInvalidCursor {
    '.tag': 'invalid_cursor';
  }

  interface SharingListFoldersContinueErrorOther {
    '.tag': 'other';
  }

  type SharingListFoldersContinueError = SharingListFoldersContinueErrorInvalidCursor | SharingListFoldersContinueErrorOther;

  /**
   * Result for :route:`list_folders` or :route:`list_mountable_folders`,
   * depending on which endpoint was requested. Unmounted shared folders can be
   * identified by the absence of :field:`SharedFolderMetadata.path_lower`.
   */
  interface SharingListFoldersResult {
    /**
     * List of all shared folders the authenticated user has access to.
     */
    entries: Array<SharingSharedFolderMetadata>;
    /**
     * Present if there are additional shared folders that have not been
     * returned yet. Pass the cursor into the corresponding continue endpoint
     * (either :route:`list_folders/continue` or
     * :route:`list_mountable_folders/continue`) to list additional folders.
     */
    cursor?: string;
  }

  interface SharingListSharedLinksArg {
    /**
     * See :route:`list_shared_links` description.
     */
    path?: string;
    /**
     * The cursor returned by your last call to :route:`list_shared_links`.
     */
    cursor?: string;
    /**
     * See :route:`list_shared_links` description.
     */
    direct_only?: boolean;
  }

  interface SharingListSharedLinksErrorPath {
    '.tag': 'path';
    path: FilesLookupError;
  }

  /**
   * Indicates that the cursor has been invalidated. Call
   * :route:`list_shared_links` to obtain a new cursor.
   */
  interface SharingListSharedLinksErrorReset {
    '.tag': 'reset';
  }

  interface SharingListSharedLinksErrorOther {
    '.tag': 'other';
  }

  type SharingListSharedLinksError = SharingListSharedLinksErrorPath | SharingListSharedLinksErrorReset | SharingListSharedLinksErrorOther;

  interface SharingListSharedLinksResult {
    /**
     * Shared links applicable to the path argument.
     */
    links: Array<SharingSharedLinkMetadata>;
    /**
     * Is true if there are additional shared links that have not been returned
     * yet. Pass the cursor into :route:`list_shared_links` to retrieve them.
     */
    has_more: boolean;
    /**
     * Pass the cursor into :route:`list_shared_links` to obtain the additional
     * links. Cursor is returned only if no path is given or the path is empty.
     */
    cursor?: string;
  }

  /**
   * Contains information about a member's access level to content after an
   * operation.
   */
  interface SharingMemberAccessLevelResult {
    /**
     * The member still has this level of access to the content through a parent
     * folder.
     */
    access_level?: SharingAccessLevel;
    /**
     * A localized string with additional information about why the user has
     * this access level to the content.
     */
    warning?: string;
    /**
     * The parent folders that a member has access to. The field is present if
     * the user has access to the first parent folder where the member gains
     * access.
     */
    access_details?: Array<SharingParentFolderAccessInfo>;
  }

  /**
   * Allow the member to keep a copy of the folder when removing.
   */
  interface SharingMemberActionLeaveACopy {
    '.tag': 'leave_a_copy';
  }

  /**
   * Make the member an editor of the folder.
   */
  interface SharingMemberActionMakeEditor {
    '.tag': 'make_editor';
  }

  /**
   * Make the member an owner of the folder.
   */
  interface SharingMemberActionMakeOwner {
    '.tag': 'make_owner';
  }

  /**
   * Make the member a viewer of the folder.
   */
  interface SharingMemberActionMakeViewer {
    '.tag': 'make_viewer';
  }

  /**
   * Make the member a viewer of the folder without commenting permissions.
   */
  interface SharingMemberActionMakeViewerNoComment {
    '.tag': 'make_viewer_no_comment';
  }

  /**
   * Remove the member from the folder.
   */
  interface SharingMemberActionRemove {
    '.tag': 'remove';
  }

  interface SharingMemberActionOther {
    '.tag': 'other';
  }

  /**
   * Actions that may be taken on members of a shared folder.
   */
  type SharingMemberAction = SharingMemberActionLeaveACopy | SharingMemberActionMakeEditor | SharingMemberActionMakeOwner | SharingMemberActionMakeViewer | SharingMemberActionMakeViewerNoComment | SharingMemberActionRemove | SharingMemberActionOther;

  /**
   * Whether the user is allowed to take the action on the associated member.
   */
  interface SharingMemberPermission {
    /**
     * The action that the user may wish to take on the member.
     */
    action: SharingMemberAction;
    /**
     * True if the user is allowed to take the action.
     */
    allow: boolean;
    /**
     * The reason why the user is denied the permission. Not present if the
     * action is allowed
     */
    reason?: SharingPermissionDeniedReason;
  }

  /**
   * Only a teammate can become a member.
   */
  interface SharingMemberPolicyTeam {
    '.tag': 'team';
  }

  /**
   * Anyone can become a member.
   */
  interface SharingMemberPolicyAnyone {
    '.tag': 'anyone';
  }

  interface SharingMemberPolicyOther {
    '.tag': 'other';
  }

  /**
   * Policy governing who can be a member of a shared folder. Only applicable to
   * folders owned by a user on a team.
   */
  type SharingMemberPolicy = SharingMemberPolicyTeam | SharingMemberPolicyAnyone | SharingMemberPolicyOther;

  /**
   * Dropbox account, team member, or group ID of member.
   */
  interface SharingMemberSelectorDropboxId {
    '.tag': 'dropbox_id';
    dropbox_id: string;
  }

  /**
   * E-mail address of member.
   */
  interface SharingMemberSelectorEmail {
    '.tag': 'email';
    email: string;
  }

  interface SharingMemberSelectorOther {
    '.tag': 'other';
  }

  /**
   * Includes different ways to identify a member of a shared folder.
   */
  type SharingMemberSelector = SharingMemberSelectorDropboxId | SharingMemberSelectorEmail | SharingMemberSelectorOther;

  /**
   * The information about a member of the shared content.
   */
  interface SharingMembershipInfo {
    /**
     * The access type for this member.
     */
    access_type: SharingAccessLevel;
    /**
     * The permissions that requesting user has on this member. The set of
     * permissions corresponds to the MemberActions in the request.
     */
    permissions?: Array<SharingMemberPermission>;
    /**
     * Suggested name initials for a member.
     */
    initials?: string;
    /**
     * True if the member has access from a parent folder.
     */
    is_inherited: boolean;
  }

  interface SharingModifySharedLinkSettingsArgs {
    /**
     * URL of the shared link to change its settings
     */
    url: string;
    /**
     * Set of settings for the shared link.
     */
    settings: SharingSharedLinkSettings;
    /**
     * If set to true, removes the expiration of the shared link.
     */
    remove_expiration: boolean;
  }

  /**
   * There is an error with the given settings
   */
  interface SharingModifySharedLinkSettingsErrorSettingsError {
    '.tag': 'settings_error';
    settings_error: SharingSharedLinkSettingsError;
  }

  /**
   * The caller's email should be verified
   */
  interface SharingModifySharedLinkSettingsErrorEmailNotVerified {
    '.tag': 'email_not_verified';
  }

  type SharingModifySharedLinkSettingsError = SharingSharedLinkError | SharingModifySharedLinkSettingsErrorSettingsError | SharingModifySharedLinkSettingsErrorEmailNotVerified;

  interface SharingMountFolderArg {
    /**
     * The ID of the shared folder to mount.
     */
    shared_folder_id: string;
  }

  interface SharingMountFolderErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharedFolderAccessError;
  }

  /**
   * Mounting would cause a shared folder to be inside another, which is
   * disallowed.
   */
  interface SharingMountFolderErrorInsideSharedFolder {
    '.tag': 'inside_shared_folder';
  }

  /**
   * The current user does not have enough space to mount the shared folder.
   */
  interface SharingMountFolderErrorInsufficientQuota {
    '.tag': 'insufficient_quota';
    insufficient_quota: SharingInsufficientQuotaAmounts;
  }

  /**
   * The shared folder is already mounted.
   */
  interface SharingMountFolderErrorAlreadyMounted {
    '.tag': 'already_mounted';
  }

  /**
   * The current user does not have permission to perform this action.
   */
  interface SharingMountFolderErrorNoPermission {
    '.tag': 'no_permission';
  }

  /**
   * The shared folder is not mountable. One example where this can occur is
   * when the shared folder belongs within a team folder in the user's Dropbox.
   */
  interface SharingMountFolderErrorNotMountable {
    '.tag': 'not_mountable';
  }

  interface SharingMountFolderErrorOther {
    '.tag': 'other';
  }

  type SharingMountFolderError = SharingMountFolderErrorAccessError | SharingMountFolderErrorInsideSharedFolder | SharingMountFolderErrorInsufficientQuota | SharingMountFolderErrorAlreadyMounted | SharingMountFolderErrorNoPermission | SharingMountFolderErrorNotMountable | SharingMountFolderErrorOther;

  /**
   * Contains information about a parent folder that a member has access to.
   */
  interface SharingParentFolderAccessInfo {
    /**
     * Display name for the folder.
     */
    folder_name: string;
    /**
     * The identifier of the parent shared folder.
     */
    shared_folder_id: string;
    /**
     * The user's permissions for the parent shared folder.
     */
    permissions: Array<SharingMemberPermission>;
  }

  /**
   * Metadata for a path-based shared link.
   */
  interface SharingPathLinkMetadata extends SharingLinkMetadata {
    /**
     * Path in user's Dropbox.
     */
    path: string;
  }

  /**
   * Assume pending uploads are files.
   */
  interface SharingPendingUploadModeFile {
    '.tag': 'file';
  }

  /**
   * Assume pending uploads are folders.
   */
  interface SharingPendingUploadModeFolder {
    '.tag': 'folder';
  }

  /**
   * Flag to indicate pending upload default (for linking to not-yet-existing
   * paths).
   */
  type SharingPendingUploadMode = SharingPendingUploadModeFile | SharingPendingUploadModeFolder;

  /**
   * User is not on the same team as the folder owner.
   */
  interface SharingPermissionDeniedReasonUserNotSameTeamAsOwner {
    '.tag': 'user_not_same_team_as_owner';
  }

  /**
   * User is prohibited by the owner from taking the action.
   */
  interface SharingPermissionDeniedReasonUserNotAllowedByOwner {
    '.tag': 'user_not_allowed_by_owner';
  }

  /**
   * Target is indirectly a member of the folder, for example by being part of a
   * group.
   */
  interface SharingPermissionDeniedReasonTargetIsIndirectMember {
    '.tag': 'target_is_indirect_member';
  }

  /**
   * Target is the owner of the folder.
   */
  interface SharingPermissionDeniedReasonTargetIsOwner {
    '.tag': 'target_is_owner';
  }

  /**
   * Target is the user itself.
   */
  interface SharingPermissionDeniedReasonTargetIsSelf {
    '.tag': 'target_is_self';
  }

  /**
   * Target is not an active member of the team.
   */
  interface SharingPermissionDeniedReasonTargetNotActive {
    '.tag': 'target_not_active';
  }

  /**
   * Folder is team folder for a limited team.
   */
  interface SharingPermissionDeniedReasonFolderIsLimitedTeamFolder {
    '.tag': 'folder_is_limited_team_folder';
  }

  interface SharingPermissionDeniedReasonOther {
    '.tag': 'other';
  }

  /**
   * Possible reasons the user is denied a permission.
   */
  type SharingPermissionDeniedReason = SharingPermissionDeniedReasonUserNotSameTeamAsOwner | SharingPermissionDeniedReasonUserNotAllowedByOwner | SharingPermissionDeniedReasonTargetIsIndirectMember | SharingPermissionDeniedReasonTargetIsOwner | SharingPermissionDeniedReasonTargetIsSelf | SharingPermissionDeniedReasonTargetNotActive | SharingPermissionDeniedReasonFolderIsLimitedTeamFolder | SharingPermissionDeniedReasonOther;

  interface SharingRelinquishFileMembershipArg {
    /**
     * The path or id for the file.
     */
    file: string;
  }

  interface SharingRelinquishFileMembershipErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharingFileAccessError;
  }

  /**
   * The current user has access to the shared file via a group.  You can't
   * relinquish membership to a file shared via groups.
   */
  interface SharingRelinquishFileMembershipErrorGroupAccess {
    '.tag': 'group_access';
  }

  /**
   * The current user does not have permission to perform this action.
   */
  interface SharingRelinquishFileMembershipErrorNoPermission {
    '.tag': 'no_permission';
  }

  interface SharingRelinquishFileMembershipErrorOther {
    '.tag': 'other';
  }

  type SharingRelinquishFileMembershipError = SharingRelinquishFileMembershipErrorAccessError | SharingRelinquishFileMembershipErrorGroupAccess | SharingRelinquishFileMembershipErrorNoPermission | SharingRelinquishFileMembershipErrorOther;

  interface SharingRelinquishFolderMembershipArg {
    /**
     * The ID for the shared folder.
     */
    shared_folder_id: string;
    /**
     * Keep a copy of the folder's contents upon relinquishing membership.
     */
    leave_a_copy: boolean;
  }

  interface SharingRelinquishFolderMembershipErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharedFolderAccessError;
  }

  /**
   * The current user is the owner of the shared folder. Owners cannot
   * relinquish membership to their own folders. Try unsharing or transferring
   * ownership first.
   */
  interface SharingRelinquishFolderMembershipErrorFolderOwner {
    '.tag': 'folder_owner';
  }

  /**
   * The shared folder is currently mounted.  Unmount the shared folder before
   * relinquishing membership.
   */
  interface SharingRelinquishFolderMembershipErrorMounted {
    '.tag': 'mounted';
  }

  /**
   * The current user has access to the shared folder via a group.  You can't
   * relinquish membership to folders shared via groups.
   */
  interface SharingRelinquishFolderMembershipErrorGroupAccess {
    '.tag': 'group_access';
  }

  /**
   * This action cannot be performed on a team shared folder.
   */
  interface SharingRelinquishFolderMembershipErrorTeamFolder {
    '.tag': 'team_folder';
  }

  /**
   * The current user does not have permission to perform this action.
   */
  interface SharingRelinquishFolderMembershipErrorNoPermission {
    '.tag': 'no_permission';
  }

  interface SharingRelinquishFolderMembershipErrorOther {
    '.tag': 'other';
  }

  type SharingRelinquishFolderMembershipError = SharingRelinquishFolderMembershipErrorAccessError | SharingRelinquishFolderMembershipErrorFolderOwner | SharingRelinquishFolderMembershipErrorMounted | SharingRelinquishFolderMembershipErrorGroupAccess | SharingRelinquishFolderMembershipErrorTeamFolder | SharingRelinquishFolderMembershipErrorNoPermission | SharingRelinquishFolderMembershipErrorOther;

  /**
   * Arguments for :route:`remove_file_member_2`.
   */
  interface SharingRemoveFileMemberArg {
    /**
     * File from which to remove members.
     */
    file: string;
    /**
     * Member to remove from this file. Note that even if an email is specified,
     * it may result in the removal of a user (not an invitee) if the user's
     * main account corresponds to that email address.
     */
    member: SharingMemberSelector;
  }

  interface SharingRemoveFileMemberErrorUserError {
    '.tag': 'user_error';
    user_error: SharingSharingUserError;
  }

  interface SharingRemoveFileMemberErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharingFileAccessError;
  }

  /**
   * This member does not have explicit access to the file and therefore cannot
   * be removed. The return value is the access that a user might have to the
   * file from a parent folder.
   */
  interface SharingRemoveFileMemberErrorNoExplicitAccess {
    '.tag': 'no_explicit_access';
    no_explicit_access: SharingMemberAccessLevelResult;
  }

  interface SharingRemoveFileMemberErrorOther {
    '.tag': 'other';
  }

  /**
   * Errors for :route:`remove_file_member_2`.
   */
  type SharingRemoveFileMemberError = SharingRemoveFileMemberErrorUserError | SharingRemoveFileMemberErrorAccessError | SharingRemoveFileMemberErrorNoExplicitAccess | SharingRemoveFileMemberErrorOther;

  interface SharingRemoveFolderMemberArg {
    /**
     * The ID for the shared folder.
     */
    shared_folder_id: string;
    /**
     * The member to remove from the folder.
     */
    member: SharingMemberSelector;
    /**
     * If true, the removed user will keep their copy of the folder after it's
     * unshared, assuming it was mounted. Otherwise, it will be removed from
     * their Dropbox. Also, this must be set to false when kicking a group.
     */
    leave_a_copy: boolean;
  }

  interface SharingRemoveFolderMemberErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharedFolderAccessError;
  }

  interface SharingRemoveFolderMemberErrorMemberError {
    '.tag': 'member_error';
    member_error: SharingSharedFolderMemberError;
  }

  /**
   * The target user is the owner of the shared folder. You can't remove this
   * user until ownership has been transferred to another member.
   */
  interface SharingRemoveFolderMemberErrorFolderOwner {
    '.tag': 'folder_owner';
  }

  /**
   * The target user has access to the shared folder via a group.
   */
  interface SharingRemoveFolderMemberErrorGroupAccess {
    '.tag': 'group_access';
  }

  /**
   * This action cannot be performed on a team shared folder.
   */
  interface SharingRemoveFolderMemberErrorTeamFolder {
    '.tag': 'team_folder';
  }

  /**
   * The current user does not have permission to perform this action.
   */
  interface SharingRemoveFolderMemberErrorNoPermission {
    '.tag': 'no_permission';
  }

  interface SharingRemoveFolderMemberErrorOther {
    '.tag': 'other';
  }

  type SharingRemoveFolderMemberError = SharingRemoveFolderMemberErrorAccessError | SharingRemoveFolderMemberErrorMemberError | SharingRemoveFolderMemberErrorFolderOwner | SharingRemoveFolderMemberErrorGroupAccess | SharingRemoveFolderMemberErrorTeamFolder | SharingRemoveFolderMemberErrorNoPermission | SharingRemoveFolderMemberErrorOther;

  /**
   * Removing the folder member has finished. The value is information about
   * whether the member has another form of access.
   */
  interface SharingRemoveMemberJobStatusComplete {
    '.tag': 'complete';
    complete: SharingMemberAccessLevelResult;
  }

  interface SharingRemoveMemberJobStatusFailed {
    '.tag': 'failed';
    failed: SharingRemoveFolderMemberError;
  }

  type SharingRemoveMemberJobStatus = AsyncPollResultBase | SharingRemoveMemberJobStatusComplete | SharingRemoveMemberJobStatusFailed;

  /**
   * Anyone who has received the link can access it. No login required.
   */
  interface SharingRequestedVisibilityPublic {
    '.tag': 'public';
  }

  /**
   * Only members of the same team can access the link. Login is required.
   */
  interface SharingRequestedVisibilityTeamOnly {
    '.tag': 'team_only';
  }

  /**
   * A link-specific password is required to access the link. Login is not
   * required.
   */
  interface SharingRequestedVisibilityPassword {
    '.tag': 'password';
  }

  /**
   * The access permission that can be requested by the caller for the shared
   * link. Note that the final resolved visibility of the shared link takes into
   * account other aspects, such as team and shared folder settings. Check the
   * :type:`ResolvedVisibility` for more info on the possible resolved
   * visibility values of shared links.
   */
  type SharingRequestedVisibility = SharingRequestedVisibilityPublic | SharingRequestedVisibilityTeamOnly | SharingRequestedVisibilityPassword;

  /**
   * Only members of the same team who have the link-specific password can
   * access the link. Login is required.
   */
  interface SharingResolvedVisibilityTeamAndPassword {
    '.tag': 'team_and_password';
  }

  /**
   * Only members of the shared folder containing the linked file can access the
   * link. Login is required.
   */
  interface SharingResolvedVisibilitySharedFolderOnly {
    '.tag': 'shared_folder_only';
  }

  interface SharingResolvedVisibilityOther {
    '.tag': 'other';
  }

  /**
   * The actual access permissions values of shared links after taking into
   * account user preferences and the team and shared folder settings. Check the
   * :type:`RequestedVisibility` for more info on the possible visibility values
   * that can be set by the shared link's owner.
   */
  type SharingResolvedVisibility = SharingRequestedVisibility | SharingResolvedVisibilityTeamAndPassword | SharingResolvedVisibilitySharedFolderOnly | SharingResolvedVisibilityOther;

  interface SharingRevokeSharedLinkArg {
    /**
     * URL of the shared link.
     */
    url: string;
  }

  /**
   * Shared link is malformed.
   */
  interface SharingRevokeSharedLinkErrorSharedLinkMalformed {
    '.tag': 'shared_link_malformed';
  }

  type SharingRevokeSharedLinkError = SharingSharedLinkError | SharingRevokeSharedLinkErrorSharedLinkMalformed;

  interface SharingShareFolderArg {
    /**
     * The path to the folder to share. If it does not exist, then a new one is
     * created.
     */
    path: string;
    /**
     * Who can be a member of this shared folder. Only applicable if the current
     * user is on a team.
     */
    member_policy: SharingMemberPolicy;
    /**
     * Who can add and remove members of this shared folder.
     */
    acl_update_policy: SharingAclUpdatePolicy;
    /**
     * The policy to apply to shared links created for content inside this
     * shared folder.  The current user must be on a team to set this policy to
     * :field:`SharedLinkPolicy.members`.
     */
    shared_link_policy: SharingSharedLinkPolicy;
    /**
     * Whether to force the share to happen asynchronously.
     */
    force_async: boolean;
  }

  /**
   * The current user does not have permission to perform this action.
   */
  interface SharingShareFolderErrorNoPermission {
    '.tag': 'no_permission';
  }

  type SharingShareFolderError = SharingShareFolderErrorBase | SharingShareFolderErrorNoPermission;

  /**
   * The current user's e-mail address is unverified.
   */
  interface SharingShareFolderErrorBaseEmailUnverified {
    '.tag': 'email_unverified';
  }

  /**
   * :field:`ShareFolderArg.path` is invalid.
   */
  interface SharingShareFolderErrorBaseBadPath {
    '.tag': 'bad_path';
    bad_path: SharingSharePathError;
  }

  /**
   * Team policy is more restrictive than :field:`ShareFolderArg.member_policy`.
   */
  interface SharingShareFolderErrorBaseTeamPolicyDisallowsMemberPolicy {
    '.tag': 'team_policy_disallows_member_policy';
  }

  /**
   * The current user's account is not allowed to select the specified
   * :field:`ShareFolderArg.shared_link_policy`.
   */
  interface SharingShareFolderErrorBaseDisallowedSharedLinkPolicy {
    '.tag': 'disallowed_shared_link_policy';
  }

  interface SharingShareFolderErrorBaseOther {
    '.tag': 'other';
  }

  type SharingShareFolderErrorBase = SharingShareFolderErrorBaseEmailUnverified | SharingShareFolderErrorBaseBadPath | SharingShareFolderErrorBaseTeamPolicyDisallowsMemberPolicy | SharingShareFolderErrorBaseDisallowedSharedLinkPolicy | SharingShareFolderErrorBaseOther;

  /**
   * The share job has finished. The value is the metadata for the folder.
   */
  interface SharingShareFolderJobStatusComplete {
    '.tag': 'complete';
    complete: SharingSharedFolderMetadata;
  }

  interface SharingShareFolderJobStatusFailed {
    '.tag': 'failed';
    failed: SharingShareFolderError;
  }

  type SharingShareFolderJobStatus = AsyncPollResultBase | SharingShareFolderJobStatusComplete | SharingShareFolderJobStatusFailed;

  interface SharingShareFolderLaunchComplete {
    '.tag': 'complete';
    complete: SharingSharedFolderMetadata;
  }

  type SharingShareFolderLaunch = AsyncLaunchResultBase | SharingShareFolderLaunchComplete;

  /**
   * A file is at the specified path.
   */
  interface SharingSharePathErrorIsFile {
    '.tag': 'is_file';
  }

  /**
   * We do not support sharing a folder inside a shared folder.
   */
  interface SharingSharePathErrorInsideSharedFolder {
    '.tag': 'inside_shared_folder';
  }

  /**
   * We do not support shared folders that contain shared folders.
   */
  interface SharingSharePathErrorContainsSharedFolder {
    '.tag': 'contains_shared_folder';
  }

  /**
   * We do not support sharing an app folder.
   */
  interface SharingSharePathErrorIsAppFolder {
    '.tag': 'is_app_folder';
  }

  /**
   * We do not support sharing a folder inside an app folder.
   */
  interface SharingSharePathErrorInsideAppFolder {
    '.tag': 'inside_app_folder';
  }

  /**
   * A public folder can't be shared this way. Use a public link instead.
   */
  interface SharingSharePathErrorIsPublicFolder {
    '.tag': 'is_public_folder';
  }

  /**
   * A folder inside a public folder can't be shared this way. Use a public link
   * instead.
   */
  interface SharingSharePathErrorInsidePublicFolder {
    '.tag': 'inside_public_folder';
  }

  /**
   * Folder is already shared. Contains metadata about the existing shared
   * folder.
   */
  interface SharingSharePathErrorAlreadyShared {
    '.tag': 'already_shared';
    already_shared: SharingSharedFolderMetadata;
  }

  /**
   * Path is not valid.
   */
  interface SharingSharePathErrorInvalidPath {
    '.tag': 'invalid_path';
  }

  /**
   * We do not support sharing a Mac OS X package.
   */
  interface SharingSharePathErrorIsOsxPackage {
    '.tag': 'is_osx_package';
  }

  /**
   * We do not support sharing a folder inside a Mac OS X package.
   */
  interface SharingSharePathErrorInsideOsxPackage {
    '.tag': 'inside_osx_package';
  }

  interface SharingSharePathErrorOther {
    '.tag': 'other';
  }

  type SharingSharePathError = SharingSharePathErrorIsFile | SharingSharePathErrorInsideSharedFolder | SharingSharePathErrorContainsSharedFolder | SharingSharePathErrorIsAppFolder | SharingSharePathErrorInsideAppFolder | SharingSharePathErrorIsPublicFolder | SharingSharePathErrorInsidePublicFolder | SharingSharePathErrorAlreadyShared | SharingSharePathErrorInvalidPath | SharingSharePathErrorIsOsxPackage | SharingSharePathErrorInsideOsxPackage | SharingSharePathErrorOther;

  /**
   * Shared file user, group, and invitee membership. Used for the results of
   * :route:`list_file_members` and :route:`list_file_members/continue`, and
   * used as part of the results for :route:`list_file_members/batch`.
   */
  interface SharingSharedFileMembers {
    /**
     * The list of user members of the shared file.
     */
    users: Array<SharingUserMembershipInfo>;
    /**
     * The list of group members of the shared file.
     */
    groups: Array<SharingGroupMembershipInfo>;
    /**
     * The list of invited members of a file, but have not logged in and claimed
     * this.
     */
    invitees: Array<SharingInviteeMembershipInfo>;
    /**
     * Present if there are additional shared file members that have not been
     * returned yet. Pass the cursor into :route:`list_file_members/continue` to
     * list additional members.
     */
    cursor?: string;
  }

  /**
   * Properties of the shared file.
   */
  interface SharingSharedFileMetadata {
    /**
     * Policies governing this shared file.
     */
    policy: SharingFolderPolicy;
    /**
     * The sharing permissions that requesting user has on this file. This
     * corresponds to the entries given in
     * :field:`GetFileMetadataBatchArg.actions` or
     * :field:`GetFileMetadataArg.actions`.
     */
    permissions?: Array<SharingFilePermission>;
    /**
     * The team that owns the file. This field is not present if the file is not
     * owned by a team.
     */
    owner_team?: UsersTeam;
    /**
     * The ID of the parent shared folder. This field is present only if the
     * file is contained within a shared folder.
     */
    parent_shared_folder_id?: string;
    /**
     * URL for displaying a web preview of the shared file.
     */
    preview_url: string;
    /**
     * The lower-case full path of this file. Absent for unmounted files.
     */
    path_lower?: string;
    /**
     * The cased path to be used for display purposes only. In rare instances
     * the casing will not correctly match the user's filesystem, but this
     * behavior will match the path provided in the Core API v1. Absent for
     * unmounted files.
     */
    path_display?: string;
    /**
     * The name of this file.
     */
    name: string;
    /**
     * The ID of the file.
     */
    id: string;
    /**
     * Timestamp indicating when the current user was invited to this shared
     * file. If the user was not invited to the shared file, the timestamp will
     * indicate when the user was invited to the parent shared folder. This
     * value may be absent.
     */
    time_invited?: Timestamp;
  }

  /**
   * This shared folder ID is invalid.
   */
  interface SharingSharedFolderAccessErrorInvalidId {
    '.tag': 'invalid_id';
  }

  /**
   * The user is not a member of the shared folder thus cannot access it.
   */
  interface SharingSharedFolderAccessErrorNotAMember {
    '.tag': 'not_a_member';
  }

  /**
   * The current user's e-mail address is unverified.
   */
  interface SharingSharedFolderAccessErrorEmailUnverified {
    '.tag': 'email_unverified';
  }

  /**
   * The shared folder is unmounted.
   */
  interface SharingSharedFolderAccessErrorUnmounted {
    '.tag': 'unmounted';
  }

  interface SharingSharedFolderAccessErrorOther {
    '.tag': 'other';
  }

  /**
   * There is an error accessing the shared folder.
   */
  type SharingSharedFolderAccessError = SharingSharedFolderAccessErrorInvalidId | SharingSharedFolderAccessErrorNotAMember | SharingSharedFolderAccessErrorEmailUnverified | SharingSharedFolderAccessErrorUnmounted | SharingSharedFolderAccessErrorOther;

  /**
   * The target dropbox_id is invalid.
   */
  interface SharingSharedFolderMemberErrorInvalidDropboxId {
    '.tag': 'invalid_dropbox_id';
  }

  /**
   * The target dropbox_id is not a member of the shared folder.
   */
  interface SharingSharedFolderMemberErrorNotAMember {
    '.tag': 'not_a_member';
  }

  /**
   * The target member only has inherited access to the shared folder.
   */
  interface SharingSharedFolderMemberErrorNoExplicitAccess {
    '.tag': 'no_explicit_access';
    no_explicit_access: SharingMemberAccessLevelResult;
  }

  interface SharingSharedFolderMemberErrorOther {
    '.tag': 'other';
  }

  type SharingSharedFolderMemberError = SharingSharedFolderMemberErrorInvalidDropboxId | SharingSharedFolderMemberErrorNotAMember | SharingSharedFolderMemberErrorNoExplicitAccess | SharingSharedFolderMemberErrorOther;

  /**
   * Shared folder user and group membership.
   */
  interface SharingSharedFolderMembers {
    /**
     * The list of user members of the shared folder.
     */
    users: Array<SharingUserMembershipInfo>;
    /**
     * The list of group members of the shared folder.
     */
    groups: Array<SharingGroupMembershipInfo>;
    /**
     * The list of invitees to the shared folder.
     */
    invitees: Array<SharingInviteeMembershipInfo>;
    /**
     * Present if there are additional shared folder members that have not been
     * returned yet. Pass the cursor into :route:`list_folder_members/continue`
     * to list additional members.
     */
    cursor?: string;
  }

  /**
   * The metadata which includes basic information about the shared folder.
   */
  interface SharingSharedFolderMetadata extends SharingSharedFolderMetadataBase {
    /**
     * The lower-cased full path of this shared folder. Absent for unmounted
     * folders.
     */
    path_lower?: string;
    /**
     * The name of the this shared folder.
     */
    name: string;
    /**
     * The ID of the shared folder.
     */
    shared_folder_id: string;
    /**
     * Actions the current user may perform on the folder and its contents. The
     * set of permissions corresponds to the FolderActions in the request.
     */
    permissions?: Array<SharingFolderPermission>;
    /**
     * Timestamp indicating when the current user was invited to this shared
     * folder.
     */
    time_invited: Timestamp;
    /**
     * URL for displaying a web preview of the shared folder.
     */
    preview_url: string;
  }

  /**
   * Properties of the shared folder.
   */
  interface SharingSharedFolderMetadataBase {
    /**
     * The current user's access level for this shared folder.
     */
    access_type: SharingAccessLevel;
    /**
     * Whether this folder is a :link:`team folder
     * https://www.dropbox.com/en/help/986`.
     */
    is_team_folder: boolean;
    /**
     * Policies governing this shared folder.
     */
    policy: SharingFolderPolicy;
    /**
     * The team that owns the folder. This field is not present if the folder is
     * not owned by a team.
     */
    owner_team?: UsersTeam;
    /**
     * The ID of the parent shared folder. This field is present only if the
     * folder is contained within another shared folder.
     */
    parent_shared_folder_id?: string;
  }

  /**
   * User is not logged in.
   */
  interface SharingSharedLinkAccessFailureReasonLoginRequired {
    '.tag': 'login_required';
  }

  /**
   * User's email is not verified.
   */
  interface SharingSharedLinkAccessFailureReasonEmailVerifyRequired {
    '.tag': 'email_verify_required';
  }

  /**
   * The link is password protected.
   */
  interface SharingSharedLinkAccessFailureReasonPasswordRequired {
    '.tag': 'password_required';
  }

  /**
   * Access is allowed for team members only.
   */
  interface SharingSharedLinkAccessFailureReasonTeamOnly {
    '.tag': 'team_only';
  }

  /**
   * Access is allowed for the shared link's owner only.
   */
  interface SharingSharedLinkAccessFailureReasonOwnerOnly {
    '.tag': 'owner_only';
  }

  interface SharingSharedLinkAccessFailureReasonOther {
    '.tag': 'other';
  }

  type SharingSharedLinkAccessFailureReason = SharingSharedLinkAccessFailureReasonLoginRequired | SharingSharedLinkAccessFailureReasonEmailVerifyRequired | SharingSharedLinkAccessFailureReasonPasswordRequired | SharingSharedLinkAccessFailureReasonTeamOnly | SharingSharedLinkAccessFailureReasonOwnerOnly | SharingSharedLinkAccessFailureReasonOther;

  /**
   * The shared link wasn't found
   */
  interface SharingSharedLinkErrorSharedLinkNotFound {
    '.tag': 'shared_link_not_found';
  }

  /**
   * The caller is not allowed to access this shared link
   */
  interface SharingSharedLinkErrorSharedLinkAccessDenied {
    '.tag': 'shared_link_access_denied';
  }

  interface SharingSharedLinkErrorOther {
    '.tag': 'other';
  }

  type SharingSharedLinkError = SharingSharedLinkErrorSharedLinkNotFound | SharingSharedLinkErrorSharedLinkAccessDenied | SharingSharedLinkErrorOther;

  /**
   * The metadata of a shared link
   */
  interface SharingSharedLinkMetadata {
    /**
     * URL of the shared link.
     */
    url: string;
    /**
     * A unique identifier for the linked file.
     */
    id?: string;
    /**
     * The linked file name (including extension). This never contains a slash.
     */
    name: string;
    /**
     * Expiration time, if set. By default the link won't expire.
     */
    expires?: Timestamp;
    /**
     * The lowercased full path in the user's Dropbox. This always starts with a
     * slash. This field will only be present only if the linked file is in the
     * authenticated user's  dropbox.
     */
    path_lower?: string;
    /**
     * The link's access permissions.
     */
    link_permissions: SharingLinkPermissions;
    /**
     * The team membership information of the link's owner.  This field will
     * only be present  if the link's owner is a team member.
     */
    team_member_info?: SharingTeamMemberInfo;
    /**
     * The team information of the content's owner. This field will only be
     * present if the content's owner is a team member and the content's owner
     * team is different from the link's owner team.
     */
    content_owner_team_info?: UsersTeam;
  }

  /**
   * Links can be shared with anyone.
   */
  interface SharingSharedLinkPolicyAnyone {
    '.tag': 'anyone';
  }

  /**
   * Links can only be shared among members of the shared folder.
   */
  interface SharingSharedLinkPolicyMembers {
    '.tag': 'members';
  }

  interface SharingSharedLinkPolicyOther {
    '.tag': 'other';
  }

  /**
   * Policy governing who can view shared links.
   */
  type SharingSharedLinkPolicy = SharingSharedLinkPolicyAnyone | SharingSharedLinkPolicyMembers | SharingSharedLinkPolicyOther;

  interface SharingSharedLinkSettings {
    /**
     * The requested access for this shared link.
     */
    requested_visibility?: SharingRequestedVisibility;
    /**
     * If :field:`requested_visibility` is :field:`RequestedVisibility.password`
     * this is needed to specify the password to access the link.
     */
    link_password?: string;
    /**
     * Expiration time of the shared link. By default the link won't expire.
     */
    expires?: Timestamp;
  }

  /**
   * The given settings are invalid (for example, all attributes of the
   * :type:`SharedLinkSettings` are empty, the requested visibility is
   * :field:`RequestedVisibility.password` but the
   * :field:`SharedLinkSettings.link_password` is missing,
   * :field:`SharedLinkSettings.expires` is set to the past, etc.)
   */
  interface SharingSharedLinkSettingsErrorInvalidSettings {
    '.tag': 'invalid_settings';
  }

  /**
   * User is not allowed to modify the settings of this link. Note that basic
   * users can only set :field:`RequestedVisibility.public` as the
   * :field:`SharedLinkSettings.requested_visibility` and cannot set
   * :field:`SharedLinkSettings.expires`
   */
  interface SharingSharedLinkSettingsErrorNotAuthorized {
    '.tag': 'not_authorized';
  }

  type SharingSharedLinkSettingsError = SharingSharedLinkSettingsErrorInvalidSettings | SharingSharedLinkSettingsErrorNotAuthorized;

  /**
   * Current user does not have sufficient privileges to perform the desired
   * action.
   */
  interface SharingSharingFileAccessErrorNoPermission {
    '.tag': 'no_permission';
  }

  /**
   * File specified was not found.
   */
  interface SharingSharingFileAccessErrorInvalidFile {
    '.tag': 'invalid_file';
  }

  /**
   * A folder can't be shared this way. Use folder sharing or a shared link
   * instead.
   */
  interface SharingSharingFileAccessErrorIsFolder {
    '.tag': 'is_folder';
  }

  /**
   * A file inside a public folder can't be shared this way. Use a public link
   * instead.
   */
  interface SharingSharingFileAccessErrorInsidePublicFolder {
    '.tag': 'inside_public_folder';
  }

  /**
   * A Mac OS X package can't be shared this way. Use a shared link instead.
   */
  interface SharingSharingFileAccessErrorInsideOsxPackage {
    '.tag': 'inside_osx_package';
  }

  interface SharingSharingFileAccessErrorOther {
    '.tag': 'other';
  }

  /**
   * User could not access this file.
   */
  type SharingSharingFileAccessError = SharingSharingFileAccessErrorNoPermission | SharingSharingFileAccessErrorInvalidFile | SharingSharingFileAccessErrorIsFolder | SharingSharingFileAccessErrorInsidePublicFolder | SharingSharingFileAccessErrorInsideOsxPackage | SharingSharingFileAccessErrorOther;

  /**
   * The current user must verify the account e-mail address before performing
   * this action.
   */
  interface SharingSharingUserErrorEmailUnverified {
    '.tag': 'email_unverified';
  }

  interface SharingSharingUserErrorOther {
    '.tag': 'other';
  }

  /**
   * User account had a problem preventing this action.
   */
  type SharingSharingUserError = SharingSharingUserErrorEmailUnverified | SharingSharingUserErrorOther;

  /**
   * Information about a team member.
   */
  interface SharingTeamMemberInfo {
    /**
     * Information about the member's team
     */
    team_info: UsersTeam;
    /**
     * The display name of the user.
     */
    display_name: string;
    /**
     * ID of user as a member of a team. This field will only be present if the
     * member is in the same team as current user.
     */
    member_id?: string;
  }

  interface SharingTransferFolderArg {
    /**
     * The ID for the shared folder.
     */
    shared_folder_id: string;
    /**
     * A account or team member ID to transfer ownership to.
     */
    to_dropbox_id: string;
  }

  interface SharingTransferFolderErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharedFolderAccessError;
  }

  /**
   * :field:`TransferFolderArg.to_dropbox_id` is invalid.
   */
  interface SharingTransferFolderErrorInvalidDropboxId {
    '.tag': 'invalid_dropbox_id';
  }

  /**
   * The new designated owner is not currently a member of the shared folder.
   */
  interface SharingTransferFolderErrorNewOwnerNotAMember {
    '.tag': 'new_owner_not_a_member';
  }

  /**
   * The new designated owner has not added the folder to their Dropbox.
   */
  interface SharingTransferFolderErrorNewOwnerUnmounted {
    '.tag': 'new_owner_unmounted';
  }

  /**
   * The new designated owner's e-mail address is unverified.
   */
  interface SharingTransferFolderErrorNewOwnerEmailUnverified {
    '.tag': 'new_owner_email_unverified';
  }

  /**
   * This action cannot be performed on a team shared folder.
   */
  interface SharingTransferFolderErrorTeamFolder {
    '.tag': 'team_folder';
  }

  /**
   * The current user does not have permission to perform this action.
   */
  interface SharingTransferFolderErrorNoPermission {
    '.tag': 'no_permission';
  }

  interface SharingTransferFolderErrorOther {
    '.tag': 'other';
  }

  type SharingTransferFolderError = SharingTransferFolderErrorAccessError | SharingTransferFolderErrorInvalidDropboxId | SharingTransferFolderErrorNewOwnerNotAMember | SharingTransferFolderErrorNewOwnerUnmounted | SharingTransferFolderErrorNewOwnerEmailUnverified | SharingTransferFolderErrorTeamFolder | SharingTransferFolderErrorNoPermission | SharingTransferFolderErrorOther;

  interface SharingUnmountFolderArg {
    /**
     * The ID for the shared folder.
     */
    shared_folder_id: string;
  }

  interface SharingUnmountFolderErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharedFolderAccessError;
  }

  /**
   * The current user does not have permission to perform this action.
   */
  interface SharingUnmountFolderErrorNoPermission {
    '.tag': 'no_permission';
  }

  /**
   * The shared folder can't be unmounted. One example where this can occur is
   * when the shared folder's parent folder is also a shared folder that resides
   * in the current user's Dropbox.
   */
  interface SharingUnmountFolderErrorNotUnmountable {
    '.tag': 'not_unmountable';
  }

  interface SharingUnmountFolderErrorOther {
    '.tag': 'other';
  }

  type SharingUnmountFolderError = SharingUnmountFolderErrorAccessError | SharingUnmountFolderErrorNoPermission | SharingUnmountFolderErrorNotUnmountable | SharingUnmountFolderErrorOther;

  /**
   * Arguments for :route:`unshare_file`.
   */
  interface SharingUnshareFileArg {
    /**
     * The file to unshare.
     */
    file: string;
  }

  interface SharingUnshareFileErrorUserError {
    '.tag': 'user_error';
    user_error: SharingSharingUserError;
  }

  interface SharingUnshareFileErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharingFileAccessError;
  }

  interface SharingUnshareFileErrorOther {
    '.tag': 'other';
  }

  /**
   * Error result for :route:`unshare_file`.
   */
  type SharingUnshareFileError = SharingUnshareFileErrorUserError | SharingUnshareFileErrorAccessError | SharingUnshareFileErrorOther;

  interface SharingUnshareFolderArg {
    /**
     * The ID for the shared folder.
     */
    shared_folder_id: string;
    /**
     * If true, members of this shared folder will get a copy of this folder
     * after it's unshared. Otherwise, it will be removed from their Dropbox.
     * The current user, who is an owner, will always retain their copy.
     */
    leave_a_copy: boolean;
  }

  interface SharingUnshareFolderErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharedFolderAccessError;
  }

  /**
   * This action cannot be performed on a team shared folder.
   */
  interface SharingUnshareFolderErrorTeamFolder {
    '.tag': 'team_folder';
  }

  /**
   * The current user does not have permission to perform this action.
   */
  interface SharingUnshareFolderErrorNoPermission {
    '.tag': 'no_permission';
  }

  interface SharingUnshareFolderErrorOther {
    '.tag': 'other';
  }

  type SharingUnshareFolderError = SharingUnshareFolderErrorAccessError | SharingUnshareFolderErrorTeamFolder | SharingUnshareFolderErrorNoPermission | SharingUnshareFolderErrorOther;

  interface SharingUpdateFolderMemberArg {
    /**
     * The ID for the shared folder.
     */
    shared_folder_id: string;
    /**
     * The member of the shared folder to update.  Only the
     * :field:`MemberSelector.dropbox_id` may be set at this time.
     */
    member: SharingMemberSelector;
    /**
     * The new access level for :field:`member`. :field:`AccessLevel.owner` is
     * disallowed.
     */
    access_level: SharingAccessLevel;
  }

  interface SharingUpdateFolderMemberErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharedFolderAccessError;
  }

  interface SharingUpdateFolderMemberErrorMemberError {
    '.tag': 'member_error';
    member_error: SharingSharedFolderMemberError;
  }

  /**
   * If updating the access type required the member to be added to the shared
   * folder and there was an error when adding the member.
   */
  interface SharingUpdateFolderMemberErrorNoExplicitAccess {
    '.tag': 'no_explicit_access';
    no_explicit_access: SharingAddFolderMemberError;
  }

  /**
   * The current user's account doesn't support this action. An example of this
   * is when downgrading a member from editor to viewer. This action can only be
   * performed by users that have upgraded to a Pro or Business plan.
   */
  interface SharingUpdateFolderMemberErrorInsufficientPlan {
    '.tag': 'insufficient_plan';
  }

  /**
   * The current user does not have permission to perform this action.
   */
  interface SharingUpdateFolderMemberErrorNoPermission {
    '.tag': 'no_permission';
  }

  interface SharingUpdateFolderMemberErrorOther {
    '.tag': 'other';
  }

  type SharingUpdateFolderMemberError = SharingUpdateFolderMemberErrorAccessError | SharingUpdateFolderMemberErrorMemberError | SharingUpdateFolderMemberErrorNoExplicitAccess | SharingUpdateFolderMemberErrorInsufficientPlan | SharingUpdateFolderMemberErrorNoPermission | SharingUpdateFolderMemberErrorOther;

  /**
   * If any of the policy's are unset, then they retain their current setting.
   */
  interface SharingUpdateFolderPolicyArg {
    /**
     * The ID for the shared folder.
     */
    shared_folder_id: string;
    /**
     * Who can be a member of this shared folder. Only applicable if the current
     * user is on a team.
     */
    member_policy?: SharingMemberPolicy;
    /**
     * Who can add and remove members of this shared folder.
     */
    acl_update_policy?: SharingAclUpdatePolicy;
    /**
     * The policy to apply to shared links created for content inside this
     * shared folder. The current user must be on a team to set this policy to
     * :field:`SharedLinkPolicy.members`.
     */
    shared_link_policy?: SharingSharedLinkPolicy;
  }

  interface SharingUpdateFolderPolicyErrorAccessError {
    '.tag': 'access_error';
    access_error: SharingSharedFolderAccessError;
  }

  /**
   * :field:`UpdateFolderPolicyArg.member_policy` was set even though user is
   * not on a team.
   */
  interface SharingUpdateFolderPolicyErrorNotOnTeam {
    '.tag': 'not_on_team';
  }

  /**
   * Team policy is more restrictive than :field:`ShareFolderArg.member_policy`.
   */
  interface SharingUpdateFolderPolicyErrorTeamPolicyDisallowsMemberPolicy {
    '.tag': 'team_policy_disallows_member_policy';
  }

  /**
   * The current account is not allowed to select the specified
   * :field:`ShareFolderArg.shared_link_policy`.
   */
  interface SharingUpdateFolderPolicyErrorDisallowedSharedLinkPolicy {
    '.tag': 'disallowed_shared_link_policy';
  }

  /**
   * The current user does not have permission to perform this action.
   */
  interface SharingUpdateFolderPolicyErrorNoPermission {
    '.tag': 'no_permission';
  }

  interface SharingUpdateFolderPolicyErrorOther {
    '.tag': 'other';
  }

  type SharingUpdateFolderPolicyError = SharingUpdateFolderPolicyErrorAccessError | SharingUpdateFolderPolicyErrorNotOnTeam | SharingUpdateFolderPolicyErrorTeamPolicyDisallowsMemberPolicy | SharingUpdateFolderPolicyErrorDisallowedSharedLinkPolicy | SharingUpdateFolderPolicyErrorNoPermission | SharingUpdateFolderPolicyErrorOther;

  /**
   * Basic information about a user. Use :route:`users.get_account` and
   * :route:`users.get_account_batch` to obtain more detailed information.
   */
  interface SharingUserInfo {
    /**
     * The account ID of the user.
     */
    account_id: string;
    /**
     * If the user is in the same team as current user.
     */
    same_team: boolean;
    /**
     * The team member ID of the shared folder member. Only present if
     * :field:`same_team` is true.
     */
    team_member_id?: string;
  }

  /**
   * The information about a user member of the shared content.
   */
  interface SharingUserMembershipInfo extends SharingMembershipInfo {
    /**
     * The account information for the membership user.
     */
    user: SharingUserInfo;
  }

  /**
   * Anyone who has received the link can access it. No login required.
   */
  interface SharingVisibilityPublic {
    '.tag': 'public';
  }

  /**
   * Only members of the same team can access the link. Login is required.
   */
  interface SharingVisibilityTeamOnly {
    '.tag': 'team_only';
  }

  /**
   * A link-specific password is required to access the link. Login is not
   * required.
   */
  interface SharingVisibilityPassword {
    '.tag': 'password';
  }

  /**
   * Only members of the same team who have the link-specific password can
   * access the link.
   */
  interface SharingVisibilityTeamAndPassword {
    '.tag': 'team_and_password';
  }

  /**
   * Only members of the shared folder containing the linked file can access the
   * link. Login is required.
   */
  interface SharingVisibilitySharedFolderOnly {
    '.tag': 'shared_folder_only';
  }

  interface SharingVisibilityOther {
    '.tag': 'other';
  }

  /**
   * Who can access a shared link. The most open visibility is :field:`public`.
   * The default depends on many aspects, such as team and user preferences and
   * shared folder settings.
   */
  type SharingVisibility = SharingVisibilityPublic | SharingVisibilityTeamOnly | SharingVisibilityPassword | SharingVisibilityTeamAndPassword | SharingVisibilitySharedFolderOnly | SharingVisibilityOther;

  /**
   * Information on active web sessions
   */
  interface TeamActiveWebSession extends TeamDeviceSession {
    /**
     * Information on the hosting device
     */
    user_agent: string;
    /**
     * Information on the hosting operating system
     */
    os: string;
    /**
     * Information on the browser used for this web session
     */
    browser: string;
  }

  /**
   * Arguments for adding property templates.
   */
  interface TeamAddPropertyTemplateArg extends PropertiesPropertyGroupTemplate {
  }

  interface TeamAddPropertyTemplateResult {
    /**
     * An identifier for property template added by
     * :route:`properties/template/add`.
     */
    template_id: string;
  }

  /**
   * User is an administrator of the team - has all permissions.
   */
  interface TeamAdminTierTeamAdmin {
    '.tag': 'team_admin';
  }

  /**
   * User can do most user provisioning, de-provisioning and management.
   */
  interface TeamAdminTierUserManagementAdmin {
    '.tag': 'user_management_admin';
  }

  /**
   * User can do a limited set of common support tasks for existing users.
   */
  interface TeamAdminTierSupportAdmin {
    '.tag': 'support_admin';
  }

  /**
   * User is not an admin of the team.
   */
  interface TeamAdminTierMemberOnly {
    '.tag': 'member_only';
  }

  /**
   * Describes which team-related admin permissions a user has.
   */
  type TeamAdminTier = TeamAdminTierTeamAdmin | TeamAdminTierUserManagementAdmin | TeamAdminTierSupportAdmin | TeamAdminTierMemberOnly;

  /**
   * Information on linked third party applications
   */
  interface TeamApiApp {
    /**
     * The application unique id
     */
    app_id: string;
    /**
     * The application name
     */
    app_name: string;
    /**
     * The application publisher name
     */
    publisher?: string;
    /**
     * The publisher's URL
     */
    publisher_url?: string;
    /**
     * The time this application was linked
     */
    linked?: Timestamp;
    /**
     * Whether the linked application uses a dedicated folder
     */
    is_app_folder: boolean;
  }

  /**
   * Base report structure.
   */
  interface TeamBaseDfbReport {
    /**
     * First date present in the results as 'YYYY-MM-DD' or None.
     */
    start_date: string;
  }

  /**
   * Input arguments that can be provided for most reports.
   */
  interface TeamDateRange {
    /**
     * Optional starting date (inclusive)
     */
    start_date?: Timestamp;
    /**
     * Optional ending date (exclusive)
     */
    end_date?: Timestamp;
  }

  interface TeamDateRangeErrorOther {
    '.tag': 'other';
  }

  /**
   * Errors that can originate from problems in input arguments to reports.
   */
  type TeamDateRangeError = TeamDateRangeErrorOther;

  /**
   * Information about linked Dropbox desktop client sessions
   */
  interface TeamDesktopClientSession extends TeamDeviceSession {
    /**
     * Name of the hosting desktop
     */
    host_name: string;
    /**
     * The Dropbox desktop client type
     */
    client_type: TeamDesktopPlatform;
    /**
     * The Dropbox client version
     */
    client_version: string;
    /**
     * Information on the hosting platform
     */
    platform: string;
    /**
     * Whether it's possible to delete all of the account files upon unlinking
     */
    is_delete_on_unlink_supported: boolean;
  }

  /**
   * Official Windows Dropbox desktop client
   */
  interface TeamDesktopPlatformWindows {
    '.tag': 'windows';
  }

  /**
   * Official Mac Dropbox desktop client
   */
  interface TeamDesktopPlatformMac {
    '.tag': 'mac';
  }

  /**
   * Official Linux Dropbox desktop client
   */
  interface TeamDesktopPlatformLinux {
    '.tag': 'linux';
  }

  interface TeamDesktopPlatformOther {
    '.tag': 'other';
  }

  type TeamDesktopPlatform = TeamDesktopPlatformWindows | TeamDesktopPlatformMac | TeamDesktopPlatformLinux | TeamDesktopPlatformOther;

  interface TeamDeviceSession {
    /**
     * The session id
     */
    session_id: string;
    /**
     * The IP address of the last activity from this session
     */
    ip_address?: string;
    /**
     * The country from which the last activity from this session was made
     */
    country?: string;
    /**
     * The time this session was created
     */
    created?: Timestamp;
    /**
     * The time of the last activity from this session
     */
    updated?: Timestamp;
  }

  interface TeamDeviceSessionArg {
    /**
     * The session id
     */
    session_id: string;
    /**
     * The unique id of the member owning the device
     */
    team_member_id: string;
  }

  /**
   * Each of the items is an array of values, one value per day. The value is
   * the number of devices active within a time window, ending with that day. If
   * there is no data for a day, then the value will be None.
   */
  interface TeamDevicesActive {
    /**
     * Array of number of linked windows (desktop) clients with activity.
     */
    windows: Array<Object>;
    /**
     * Array of number of linked mac (desktop) clients with activity.
     */
    macos: Array<Object>;
    /**
     * Array of number of linked linus (desktop) clients with activity.
     */
    linux: Array<Object>;
    /**
     * Array of number of linked ios devices with activity.
     */
    ios: Array<Object>;
    /**
     * Array of number of linked android devices with activity.
     */
    android: Array<Object>;
    /**
     * Array of number of other linked devices (blackberry, windows phone, etc)
     * with activity.
     */
    other: Array<Object>;
    /**
     * Array of total number of linked clients with activity.
     */
    total: Array<Object>;
  }

  /**
   * Activity Report Result. Each of the items in the storage report is an array
   * of values, one value per day. If there is no data for a day, then the value
   * will be None.
   */
  interface TeamGetActivityReport extends TeamBaseDfbReport {
    /**
     * Array of total number of adds by team members.
     */
    adds: Array<Object>;
    /**
     * Array of number of edits by team members. If the same user edits the same
     * file multiple times this is counted as a single edit.
     */
    edits: Array<Object>;
    /**
     * Array of total number of deletes by team members.
     */
    deletes: Array<Object>;
    /**
     * Array of the number of users who have been active in the last 28 days.
     */
    active_users_28_day: Array<Object>;
    /**
     * Array of the number of users who have been active in the last week.
     */
    active_users_7_day: Array<Object>;
    /**
     * Array of the number of users who have been active in the last day.
     */
    active_users_1_day: Array<Object>;
    /**
     * Array of the number of shared folders with some activity in the last 28
     * days.
     */
    active_shared_folders_28_day: Array<Object>;
    /**
     * Array of the number of shared folders with some activity in the last
     * week.
     */
    active_shared_folders_7_day: Array<Object>;
    /**
     * Array of the number of shared folders with some activity in the last day.
     */
    active_shared_folders_1_day: Array<Object>;
    /**
     * Array of the number of shared links created.
     */
    shared_links_created: Array<Object>;
    /**
     * Array of the number of views by team users to shared links created by the
     * team.
     */
    shared_links_viewed_by_team: Array<Object>;
    /**
     * Array of the number of views by users outside of the team to shared links
     * created by the team.
     */
    shared_links_viewed_by_outside_user: Array<Object>;
    /**
     * Array of the number of views by non-logged-in users to shared links
     * created by the team.
     */
    shared_links_viewed_by_not_logged_in: Array<Object>;
    /**
     * Array of the total number of views to shared links created by the team.
     */
    shared_links_viewed_total: Array<Object>;
  }

  /**
   * Devices Report Result. Contains subsections for different time ranges of
   * activity. Each of the items in each subsection of the storage report is an
   * array of values, one value per day. If there is no data for a day, then the
   * value will be None.
   */
  interface TeamGetDevicesReport extends TeamBaseDfbReport {
    /**
     * Report of the number of devices active in the last day.
     */
    active_1_day: TeamDevicesActive;
    /**
     * Report of the number of devices active in the last 7 days.
     */
    active_7_day: TeamDevicesActive;
    /**
     * Report of the number of devices active in the last 28 days.
     */
    active_28_day: TeamDevicesActive;
  }

  /**
   * Membership Report Result. Each of the items in the storage report is an
   * array of values, one value per day. If there is no data for a day, then the
   * value will be None.
   */
  interface TeamGetMembershipReport extends TeamBaseDfbReport {
    /**
     * Team size, for each day.
     */
    team_size: Array<Object>;
    /**
     * The number of pending invites to the team, for each day.
     */
    pending_invites: Array<Object>;
    /**
     * The number of members that joined the team, for each day.
     */
    members_joined: Array<Object>;
    /**
     * The number of suspended team members, for each day.
     */
    suspended_members: Array<Object>;
    /**
     * The total number of licenses the team has, for each day.
     */
    licenses: Array<Object>;
  }

  /**
   * Storage Report Result. Each of the items in the storage report is an array
   * of values, one value per day. If there is no data for a day, then the value
   * will be None.
   */
  interface TeamGetStorageReport extends TeamBaseDfbReport {
    /**
     * Sum of the shared, unshared, and datastore usages, for each day.
     */
    total_usage: Array<Object>;
    /**
     * Array of the combined size (bytes) of team members' shared folders, for
     * each day.
     */
    shared_usage: Array<Object>;
    /**
     * Array of the combined size (bytes) of team members' root namespaces, for
     * each day.
     */
    unshared_usage: Array<Object>;
    /**
     * Array of the number of shared folders owned by team members, for each
     * day.
     */
    shared_folders: Array<Object>;
    /**
     * Array of storage summaries of team members' account sizes. Each storage
     * summary is an array of key, value pairs, where each pair describes a
     * storage bucket. The key indicates the upper bound of the bucket and the
     * value is the number of users in that bucket. There is one such summary
     * per day. If there is no data for a day, the storage summary will be
     * empty.
     */
    member_storage_map: Array<Array<TeamStorageBucket>>;
  }

  /**
   * User is a member of the group, but has no special permissions.
   */
  interface TeamGroupAccessTypeMember {
    '.tag': 'member';
  }

  /**
   * User can rename the group, and add/remove members.
   */
  interface TeamGroupAccessTypeOwner {
    '.tag': 'owner';
  }

  /**
   * Role of a user in group.
   */
  type TeamGroupAccessType = TeamGroupAccessTypeMember | TeamGroupAccessTypeOwner;

  interface TeamGroupCreateArg {
    /**
     * Group name.
     */
    group_name: string;
    /**
     * The creator of a team can associate an arbitrary external ID to the
     * group.
     */
    group_external_id?: string;
    /**
     * Whether the team can be managed by selected users, or only by team admins
     */
    group_management_type?: Team_commonGroupManagementType;
  }

  /**
   * There is already an existing group with the requested name.
   */
  interface TeamGroupCreateErrorGroupNameAlreadyUsed {
    '.tag': 'group_name_already_used';
  }

  /**
   * Group name is empty or has invalid characters.
   */
  interface TeamGroupCreateErrorGroupNameInvalid {
    '.tag': 'group_name_invalid';
  }

  /**
   * The new external ID is already being used by another group.
   */
  interface TeamGroupCreateErrorExternalIdAlreadyInUse {
    '.tag': 'external_id_already_in_use';
  }

  interface TeamGroupCreateErrorOther {
    '.tag': 'other';
  }

  type TeamGroupCreateError = TeamGroupCreateErrorGroupNameAlreadyUsed | TeamGroupCreateErrorGroupNameInvalid | TeamGroupCreateErrorExternalIdAlreadyInUse | TeamGroupCreateErrorOther;

  /**
   * This group has already been deleted.
   */
  interface TeamGroupDeleteErrorGroupAlreadyDeleted {
    '.tag': 'group_already_deleted';
  }

  type TeamGroupDeleteError = TeamGroupSelectorError | TeamGroupDeleteErrorGroupAlreadyDeleted;

  /**
   * Full description of a group.
   */
  interface TeamGroupFullInfo extends Team_commonGroupSummary {
    /**
     * List of group members.
     */
    members?: Array<TeamGroupMemberInfo>;
    /**
     * The group creation time as a UTC timestamp in milliseconds since the Unix
     * epoch.
     */
    created: number;
  }

  /**
   * Profile of group member, and role in group.
   */
  interface TeamGroupMemberInfo {
    /**
     * Profile of group member.
     */
    profile: TeamMemberProfile;
    /**
     * The role that the user has in the group.
     */
    access_type: TeamGroupAccessType;
  }

  /**
   * Argument for selecting a group and a single user.
   */
  interface TeamGroupMemberSelector {
    /**
     * Specify a group.
     */
    group: TeamGroupSelector;
    /**
     * Identity of a user that is a member of :field:`group`.
     */
    user: TeamUserSelectorArg;
  }

  /**
   * The specified user is not a member of this group.
   */
  interface TeamGroupMemberSelectorErrorMemberNotInGroup {
    '.tag': 'member_not_in_group';
  }

  /**
   * Error that can be raised when :type:`GroupMemberSelector` is used, and the
   * user is required to be a member of the specified group.
   */
  type TeamGroupMemberSelectorError = TeamGroupSelectorError | TeamGroupMemberSelectorErrorMemberNotInGroup;

  /**
   * A company managed group cannot be managed by a user.
   */
  interface TeamGroupMemberSetAccessTypeErrorUserCannotBeManagerOfCompanyManagedGroup {
    '.tag': 'user_cannot_be_manager_of_company_managed_group';
  }

  type TeamGroupMemberSetAccessTypeError = TeamGroupMemberSelectorError | TeamGroupMemberSetAccessTypeErrorUserCannotBeManagerOfCompanyManagedGroup;

  interface TeamGroupMembersAddArg extends TeamIncludeMembersArg {
    /**
     * Group to which users will be added.
     */
    group: TeamGroupSelector;
    /**
     * List of users to be added to the group.
     */
    members: Array<TeamMemberAccess>;
  }

  /**
   * You cannot add duplicate users. One or more of the members you are trying
   * to add is already a member of the group.
   */
  interface TeamGroupMembersAddErrorDuplicateUser {
    '.tag': 'duplicate_user';
  }

  /**
   * Group is not in this team. You cannot add members to a group that is
   * outside of your team.
   */
  interface TeamGroupMembersAddErrorGroupNotInTeam {
    '.tag': 'group_not_in_team';
  }

  /**
   * These members are not part of your team. Currently, you cannot add members
   * to a group if they are not part of your team, though this may change in a
   * subsequent version. To add new members to your Dropbox Business team, use
   * the :route:`members/add` endpoint.
   */
  interface TeamGroupMembersAddErrorMembersNotInTeam {
    '.tag': 'members_not_in_team';
    members_not_in_team: Array<string>;
  }

  /**
   * These users were not found in Dropbox.
   */
  interface TeamGroupMembersAddErrorUsersNotFound {
    '.tag': 'users_not_found';
    users_not_found: Array<string>;
  }

  /**
   * A suspended user cannot be added to a group as
   * :field:`GroupAccessType.owner`.
   */
  interface TeamGroupMembersAddErrorUserMustBeActiveToBeOwner {
    '.tag': 'user_must_be_active_to_be_owner';
  }

  /**
   * A company-managed group cannot be managed by a user.
   */
  interface TeamGroupMembersAddErrorUserCannotBeManagerOfCompanyManagedGroup {
    '.tag': 'user_cannot_be_manager_of_company_managed_group';
    user_cannot_be_manager_of_company_managed_group: Array<string>;
  }

  type TeamGroupMembersAddError = TeamGroupSelectorError | TeamGroupMembersAddErrorDuplicateUser | TeamGroupMembersAddErrorGroupNotInTeam | TeamGroupMembersAddErrorMembersNotInTeam | TeamGroupMembersAddErrorUsersNotFound | TeamGroupMembersAddErrorUserMustBeActiveToBeOwner | TeamGroupMembersAddErrorUserCannotBeManagerOfCompanyManagedGroup;

  /**
   * Result returned by :route:`groups/members/add` and
   * :route:`groups/members/remove`.
   */
  interface TeamGroupMembersChangeResult {
    /**
     * The group info after member change operation has been performed.
     */
    group_info: TeamGroupFullInfo;
    /**
     * An ID that can be used to obtain the status of granting/revoking
     * group-owned resources.
     */
    async_job_id: string;
  }

  interface TeamGroupMembersRemoveArg extends TeamIncludeMembersArg {
    /**
     * Group from which users will be removed.
     */
    group: TeamGroupSelector;
    /**
     * List of users to be removed from the group.
     */
    users: Array<TeamUserSelectorArg>;
  }

  /**
   * Group is not in this team. You cannot remove members from a group that is
   * outside of your team.
   */
  interface TeamGroupMembersRemoveErrorGroupNotInTeam {
    '.tag': 'group_not_in_team';
  }

  type TeamGroupMembersRemoveError = TeamGroupMembersSelectorError | TeamGroupMembersRemoveErrorGroupNotInTeam;

  /**
   * Argument for selecting a group and a list of users.
   */
  interface TeamGroupMembersSelector {
    /**
     * Specify a group.
     */
    group: TeamGroupSelector;
    /**
     * A list of users that are members of :field:`group`.
     */
    users: TeamUsersSelectorArg;
  }

  /**
   * At least one of the specified users is not a member of the group.
   */
  interface TeamGroupMembersSelectorErrorMemberNotInGroup {
    '.tag': 'member_not_in_group';
  }

  /**
   * Error that can be raised when :type:`GroupMembersSelector` is used, and the
   * users are required to be members of the specified group.
   */
  type TeamGroupMembersSelectorError = TeamGroupSelectorError | TeamGroupMembersSelectorErrorMemberNotInGroup;

  interface TeamGroupMembersSetAccessTypeArg extends TeamGroupMemberSelector {
    /**
     * New group access type the user will have.
     */
    access_type: TeamGroupAccessType;
    /**
     * Whether to return the list of members in the group.  Note that the
     * default value will cause all the group members  to be returned in the
     * response. This may take a long time for large groups.
     */
    return_members: boolean;
  }

  /**
   * Group ID.
   */
  interface TeamGroupSelectorGroupId {
    '.tag': 'group_id';
    group_id: string;
  }

  /**
   * External ID of the group.
   */
  interface TeamGroupSelectorGroupExternalId {
    '.tag': 'group_external_id';
    group_external_id: string;
  }

  /**
   * Argument for selecting a single group, either by group_id or by external
   * group ID.
   */
  type TeamGroupSelector = TeamGroupSelectorGroupId | TeamGroupSelectorGroupExternalId;

  /**
   * No matching group found. No groups match the specified group ID.
   */
  interface TeamGroupSelectorErrorGroupNotFound {
    '.tag': 'group_not_found';
  }

  interface TeamGroupSelectorErrorOther {
    '.tag': 'other';
  }

  /**
   * Error that can be raised when :type:`GroupSelector` is used.
   */
  type TeamGroupSelectorError = TeamGroupSelectorErrorGroupNotFound | TeamGroupSelectorErrorOther;

  interface TeamGroupUpdateArgs extends TeamIncludeMembersArg {
    /**
     * Specify a group.
     */
    group: TeamGroupSelector;
    /**
     * Optional argument. Set group name to this if provided.
     */
    new_group_name?: string;
    /**
     * Optional argument. New group external ID. If the argument is None, the
     * group's external_id won't be updated. If the argument is empty string,
     * the group's external id will be cleared.
     */
    new_group_external_id?: string;
    /**
     * Set new group management type, if provided.
     */
    new_group_management_type?: Team_commonGroupManagementType;
  }

  /**
   * The new external ID is already being used by another group.
   */
  interface TeamGroupUpdateErrorExternalIdAlreadyInUse {
    '.tag': 'external_id_already_in_use';
  }

  type TeamGroupUpdateError = TeamGroupSelectorError | TeamGroupUpdateErrorExternalIdAlreadyInUse;

  /**
   * The group is not on your team.
   */
  interface TeamGroupsGetInfoErrorGroupNotOnTeam {
    '.tag': 'group_not_on_team';
  }

  interface TeamGroupsGetInfoErrorOther {
    '.tag': 'other';
  }

  type TeamGroupsGetInfoError = TeamGroupsGetInfoErrorGroupNotOnTeam | TeamGroupsGetInfoErrorOther;

  /**
   * An ID that was provided as a parameter to :route:`groups/get_info`, and did
   * not match a corresponding group. The ID can be a group ID, or an external
   * ID, depending on how the method was called.
   */
  interface TeamGroupsGetInfoItemIdNotFound {
    '.tag': 'id_not_found';
    id_not_found: string;
  }

  /**
   * Info about a group.
   */
  interface TeamGroupsGetInfoItemGroupInfo {
    '.tag': 'group_info';
    group_info: TeamGroupFullInfo;
  }

  type TeamGroupsGetInfoItem = TeamGroupsGetInfoItemIdNotFound | TeamGroupsGetInfoItemGroupInfo;

  interface TeamGroupsListArg {
    /**
     * Number of results to return per call.
     */
    limit: number;
  }

  interface TeamGroupsListContinueArg {
    /**
     * Indicates from what point to get the next set of groups.
     */
    cursor: string;
  }

  /**
   * The cursor is invalid.
   */
  interface TeamGroupsListContinueErrorInvalidCursor {
    '.tag': 'invalid_cursor';
  }

  interface TeamGroupsListContinueErrorOther {
    '.tag': 'other';
  }

  type TeamGroupsListContinueError = TeamGroupsListContinueErrorInvalidCursor | TeamGroupsListContinueErrorOther;

  interface TeamGroupsListResult {
    groups: Array<Team_commonGroupSummary>;
    /**
     * Pass the cursor into :route:`groups/list/continue` to obtain the
     * additional groups.
     */
    cursor: string;
    /**
     * Is true if there are additional groups that have not been returned yet.
     * An additional call to :route:`groups/list/continue` can retrieve them.
     */
    has_more: boolean;
  }

  interface TeamGroupsMembersListArg {
    /**
     * The group whose members are to be listed.
     */
    group: TeamGroupSelector;
    /**
     * Number of results to return per call.
     */
    limit: number;
  }

  interface TeamGroupsMembersListContinueArg {
    /**
     * Indicates from what point to get the next set of groups.
     */
    cursor: string;
  }

  /**
   * The cursor is invalid.
   */
  interface TeamGroupsMembersListContinueErrorInvalidCursor {
    '.tag': 'invalid_cursor';
  }

  interface TeamGroupsMembersListContinueErrorOther {
    '.tag': 'other';
  }

  type TeamGroupsMembersListContinueError = TeamGroupsMembersListContinueErrorInvalidCursor | TeamGroupsMembersListContinueErrorOther;

  interface TeamGroupsMembersListResult {
    members: Array<TeamGroupMemberInfo>;
    /**
     * Pass the cursor into :route:`groups/members/list/continue` to obtain
     * additional group members.
     */
    cursor: string;
    /**
     * Is true if there are additional group members that have not been returned
     * yet. An additional call to :route:`groups/members/list/continue` can
     * retrieve them.
     */
    has_more: boolean;
  }

  /**
   * You are not allowed to poll this job.
   */
  interface TeamGroupsPollErrorAccessDenied {
    '.tag': 'access_denied';
  }

  type TeamGroupsPollError = AsyncPollError | TeamGroupsPollErrorAccessDenied;

  /**
   * List of group IDs.
   */
  interface TeamGroupsSelectorGroupIds {
    '.tag': 'group_ids';
    group_ids: Array<Object>;
  }

  /**
   * List of external IDs of groups.
   */
  interface TeamGroupsSelectorGroupExternalIds {
    '.tag': 'group_external_ids';
    group_external_ids: Array<string>;
  }

  /**
   * Argument for selecting a list of groups, either by group_ids, or external
   * group IDs.
   */
  type TeamGroupsSelector = TeamGroupsSelectorGroupIds | TeamGroupsSelectorGroupExternalIds;

  interface TeamIncludeMembersArg {
    /**
     * Whether to return the list of members in the group.  Note that the
     * default value will cause all the group members  to be returned in the
     * response. This may take a long time for large groups.
     */
    return_members: boolean;
  }

  interface TeamListMemberAppsArg {
    /**
     * The team member id
     */
    team_member_id: string;
  }

  /**
   * Member not found.
   */
  interface TeamListMemberAppsErrorMemberNotFound {
    '.tag': 'member_not_found';
  }

  interface TeamListMemberAppsErrorOther {
    '.tag': 'other';
  }

  /**
   * Error returned by :route:`linked_apps/list_member_linked_apps`.
   */
  type TeamListMemberAppsError = TeamListMemberAppsErrorMemberNotFound | TeamListMemberAppsErrorOther;

  interface TeamListMemberAppsResult {
    /**
     * List of third party applications linked by this team member
     */
    linked_api_apps: Array<TeamApiApp>;
  }

  interface TeamListMemberDevicesArg {
    /**
     * The team's member id
     */
    team_member_id: string;
    /**
     * Whether to list web sessions of the team's member
     */
    include_web_sessions: boolean;
    /**
     * Whether to list linked desktop devices of the team's member
     */
    include_desktop_clients: boolean;
    /**
     * Whether to list linked mobile devices of the team's member
     */
    include_mobile_clients: boolean;
  }

  /**
   * Member not found.
   */
  interface TeamListMemberDevicesErrorMemberNotFound {
    '.tag': 'member_not_found';
  }

  interface TeamListMemberDevicesErrorOther {
    '.tag': 'other';
  }

  type TeamListMemberDevicesError = TeamListMemberDevicesErrorMemberNotFound | TeamListMemberDevicesErrorOther;

  interface TeamListMemberDevicesResult {
    /**
     * List of web sessions made by this team member
     */
    active_web_sessions?: Array<TeamActiveWebSession>;
    /**
     * List of desktop clients used by this team member
     */
    desktop_client_sessions?: Array<TeamDesktopClientSession>;
    /**
     * List of mobile client used by this team member
     */
    mobile_client_sessions?: Array<TeamMobileClientSession>;
  }

  /**
   * Arguments for :route:`linked_apps/list_members_linked_apps`.
   */
  interface TeamListMembersAppsArg {
    /**
     * At the first call to the :route:`linked_apps/list_members_linked_apps`
     * the cursor shouldn't be passed. Then, if the result of the call includes
     * a cursor, the following requests should include the received cursors in
     * order to receive the next sub list of the team applications
     */
    cursor?: string;
  }

  /**
   * Indicates that the cursor has been invalidated. Call
   * :route:`linked_apps/list_members_linked_apps` again with an empty cursor to
   * obtain a new cursor.
   */
  interface TeamListMembersAppsErrorReset {
    '.tag': 'reset';
  }

  interface TeamListMembersAppsErrorOther {
    '.tag': 'other';
  }

  /**
   * Error returned by :route:`linked_apps/list_members_linked_apps`
   */
  type TeamListMembersAppsError = TeamListMembersAppsErrorReset | TeamListMembersAppsErrorOther;

  /**
   * Information returned by :route:`linked_apps/list_members_linked_apps`.
   */
  interface TeamListMembersAppsResult {
    /**
     * The linked applications of each member of the team
     */
    apps: Array<TeamMemberLinkedApps>;
    /**
     * If true, then there are more apps available. Pass the cursor to
     * :route:`linked_apps/list_members_linked_apps` to retrieve the rest.
     */
    has_more: boolean;
    /**
     * Pass the cursor into :route:`linked_apps/list_members_linked_apps` to
     * receive the next sub list of team's applications.
     */
    cursor?: string;
  }

  interface TeamListMembersDevicesArg {
    /**
     * At the first call to the :route:`devices/list_members_devices` the cursor
     * shouldn't be passed. Then, if the result of the call includes a cursor,
     * the following requests should include the received cursors in order to
     * receive the next sub list of team devices
     */
    cursor?: string;
    /**
     * Whether to list web sessions of the team members
     */
    include_web_sessions: boolean;
    /**
     * Whether to list desktop clients of the team members
     */
    include_desktop_clients: boolean;
    /**
     * Whether to list mobile clients of the team members
     */
    include_mobile_clients: boolean;
  }

  /**
   * Indicates that the cursor has been invalidated. Call
   * :route:`devices/list_members_devices` again with an empty cursor to obtain
   * a new cursor.
   */
  interface TeamListMembersDevicesErrorReset {
    '.tag': 'reset';
  }

  interface TeamListMembersDevicesErrorOther {
    '.tag': 'other';
  }

  type TeamListMembersDevicesError = TeamListMembersDevicesErrorReset | TeamListMembersDevicesErrorOther;

  interface TeamListMembersDevicesResult {
    /**
     * The devices of each member of the team
     */
    devices: Array<TeamMemberDevices>;
    /**
     * If true, then there are more devices available. Pass the cursor to
     * :route:`devices/list_members_devices` to retrieve the rest.
     */
    has_more: boolean;
    /**
     * Pass the cursor into :route:`devices/list_members_devices` to receive the
     * next sub list of team's devices.
     */
    cursor?: string;
  }

  /**
   * Arguments for :route:`linked_apps/list_team_linked_apps`.
   */
  interface TeamListTeamAppsArg {
    /**
     * At the first call to the :route:`linked_apps/list_team_linked_apps` the
     * cursor shouldn't be passed. Then, if the result of the call includes a
     * cursor, the following requests should include the received cursors in
     * order to receive the next sub list of the team applications
     */
    cursor?: string;
  }

  /**
   * Indicates that the cursor has been invalidated. Call
   * :route:`linked_apps/list_team_linked_apps` again with an empty cursor to
   * obtain a new cursor.
   */
  interface TeamListTeamAppsErrorReset {
    '.tag': 'reset';
  }

  interface TeamListTeamAppsErrorOther {
    '.tag': 'other';
  }

  /**
   * Error returned by :route:`linked_apps/list_team_linked_apps`
   */
  type TeamListTeamAppsError = TeamListTeamAppsErrorReset | TeamListTeamAppsErrorOther;

  /**
   * Information returned by :route:`linked_apps/list_team_linked_apps`.
   */
  interface TeamListTeamAppsResult {
    /**
     * The linked applications of each member of the team
     */
    apps: Array<TeamMemberLinkedApps>;
    /**
     * If true, then there are more apps available. Pass the cursor to
     * :route:`linked_apps/list_team_linked_apps` to retrieve the rest.
     */
    has_more: boolean;
    /**
     * Pass the cursor into :route:`linked_apps/list_team_linked_apps` to
     * receive the next sub list of team's applications.
     */
    cursor?: string;
  }

  interface TeamListTeamDevicesArg {
    /**
     * At the first call to the :route:`devices/list_team_devices` the cursor
     * shouldn't be passed. Then, if the result of the call includes a cursor,
     * the following requests should include the received cursors in order to
     * receive the next sub list of team devices
     */
    cursor?: string;
    /**
     * Whether to list web sessions of the team members
     */
    include_web_sessions: boolean;
    /**
     * Whether to list desktop clients of the team members
     */
    include_desktop_clients: boolean;
    /**
     * Whether to list mobile clients of the team members
     */
    include_mobile_clients: boolean;
  }

  /**
   * Indicates that the cursor has been invalidated. Call
   * :route:`devices/list_team_devices` again with an empty cursor to obtain a
   * new cursor.
   */
  interface TeamListTeamDevicesErrorReset {
    '.tag': 'reset';
  }

  interface TeamListTeamDevicesErrorOther {
    '.tag': 'other';
  }

  type TeamListTeamDevicesError = TeamListTeamDevicesErrorReset | TeamListTeamDevicesErrorOther;

  interface TeamListTeamDevicesResult {
    /**
     * The devices of each member of the team
     */
    devices: Array<TeamMemberDevices>;
    /**
     * If true, then there are more devices available. Pass the cursor to
     * :route:`devices/list_team_devices` to retrieve the rest.
     */
    has_more: boolean;
    /**
     * Pass the cursor into :route:`devices/list_team_devices` to receive the
     * next sub list of team's devices.
     */
    cursor?: string;
  }

  /**
   * Specify access type a member should have when joined to a group.
   */
  interface TeamMemberAccess {
    /**
     * Identity of a user.
     */
    user: TeamUserSelectorArg;
    /**
     * Access type.
     */
    access_type: TeamGroupAccessType;
  }

  interface TeamMemberAddArg {
    member_email: string;
    /**
     * Member's first name.
     */
    member_given_name: string;
    /**
     * Member's last name.
     */
    member_surname: string;
    /**
     * External ID for member.
     */
    member_external_id?: string;
    /**
     * Whether to send a welcome email to the member. If send_welcome_email is
     * false, no email invitation will be sent to the user. This may be useful
     * for apps using single sign-on (SSO) flows for onboarding that want to
     * handle announcements themselves.
     */
    send_welcome_email: boolean;
    role: TeamAdminTier;
  }

  /**
   * Describes a user that was successfully added to the team.
   */
  interface TeamMemberAddResultSuccess {
    '.tag': 'success';
    success: TeamTeamMemberInfo;
  }

  /**
   * Team is already full. The organization has no available licenses.
   */
  interface TeamMemberAddResultTeamLicenseLimit {
    '.tag': 'team_license_limit';
    team_license_limit: string;
  }

  /**
   * Team is already full. The free team member limit has been reached.
   */
  interface TeamMemberAddResultFreeTeamMemberLimitReached {
    '.tag': 'free_team_member_limit_reached';
    free_team_member_limit_reached: string;
  }

  /**
   * User is already on this team. The provided email address is associated with
   * a user who is already a member of (including in recoverable state) or
   * invited to the team.
   */
  interface TeamMemberAddResultUserAlreadyOnTeam {
    '.tag': 'user_already_on_team';
    user_already_on_team: string;
  }

  /**
   * User is already on another team. The provided email address is associated
   * with a user that is already a member or invited to another team.
   */
  interface TeamMemberAddResultUserOnAnotherTeam {
    '.tag': 'user_on_another_team';
    user_on_another_team: string;
  }

  /**
   * User is already paired.
   */
  interface TeamMemberAddResultUserAlreadyPaired {
    '.tag': 'user_already_paired';
    user_already_paired: string;
  }

  /**
   * User migration has failed.
   */
  interface TeamMemberAddResultUserMigrationFailed {
    '.tag': 'user_migration_failed';
    user_migration_failed: string;
  }

  /**
   * A user with the given external member ID already exists on the team
   * (including in recoverable state).
   */
  interface TeamMemberAddResultDuplicateExternalMemberId {
    '.tag': 'duplicate_external_member_id';
    duplicate_external_member_id: string;
  }

  /**
   * User creation has failed.
   */
  interface TeamMemberAddResultUserCreationFailed {
    '.tag': 'user_creation_failed';
    user_creation_failed: string;
  }

  /**
   * Describes the result of attempting to add a single user to the team.
   * 'success' is the only value indicating that a user was indeed added to the
   * team - the other values explain the type of failure that occurred, and
   * include the email of the user for which the operation has failed.
   */
  type TeamMemberAddResult = TeamMemberAddResultSuccess | TeamMemberAddResultTeamLicenseLimit | TeamMemberAddResultFreeTeamMemberLimitReached | TeamMemberAddResultUserAlreadyOnTeam | TeamMemberAddResultUserOnAnotherTeam | TeamMemberAddResultUserAlreadyPaired | TeamMemberAddResultUserMigrationFailed | TeamMemberAddResultDuplicateExternalMemberId | TeamMemberAddResultUserCreationFailed;

  /**
   * Information on devices of a team's member.
   */
  interface TeamMemberDevices {
    /**
     * The member unique Id
     */
    team_member_id: string;
    /**
     * List of web sessions made by this team member
     */
    web_sessions?: Array<TeamActiveWebSession>;
    /**
     * List of desktop clients by this team member
     */
    desktop_clients?: Array<TeamDesktopClientSession>;
    /**
     * List of mobile clients by this team member
     */
    mobile_clients?: Array<TeamMobileClientSession>;
  }

  /**
   * Information on linked applications of a team member.
   */
  interface TeamMemberLinkedApps {
    /**
     * The member unique Id
     */
    team_member_id: string;
    /**
     * List of third party applications linked by this team member
     */
    linked_api_apps: Array<TeamApiApp>;
  }

  /**
   * Basic member profile.
   */
  interface TeamMemberProfile {
    /**
     * ID of user as a member of a team.
     */
    team_member_id: string;
    /**
     * External ID that a team can attach to the user. An application using the
     * API may find it easier to use their own IDs instead of Dropbox IDs like
     * account_id or team_member_id.
     */
    external_id?: string;
    /**
     * A user's account identifier.
     */
    account_id?: string;
    /**
     * Email address of user.
     */
    email: string;
    /**
     * Is true if the user's email is verified to be owned by the user.
     */
    email_verified: boolean;
    /**
     * The user's status as a member of a specific team.
     */
    status: TeamTeamMemberStatus;
    /**
     * Representations for a person's name.
     */
    name: UsersName;
    /**
     * The user's membership type: full (normal team member) vs limited (does
     * not use a license; no access to the team's shared quota).
     */
    membership_type: TeamTeamMembershipType;
  }

  /**
   * The user is not a member of the team.
   */
  interface TeamMemberSelectorErrorUserNotInTeam {
    '.tag': 'user_not_in_team';
  }

  type TeamMemberSelectorError = TeamUserSelectorError | TeamMemberSelectorErrorUserNotInTeam;

  interface TeamMembersAddArg {
    /**
     * Details of new members to be added to the team.
     */
    new_members: Array<TeamMemberAddArg>;
    /**
     * Whether to force the add to happen asynchronously.
     */
    force_async: boolean;
  }

  /**
   * The asynchronous job has finished. For each member that was specified in
   * the parameter :type:`MembersAddArg` that was provided to
   * :route:`members/add`, a corresponding item is returned in this list.
   */
  interface TeamMembersAddJobStatusComplete {
    '.tag': 'complete';
    complete: Array<TeamMemberAddResult>;
  }

  /**
   * The asynchronous job returned an error. The string contains an error
   * message.
   */
  interface TeamMembersAddJobStatusFailed {
    '.tag': 'failed';
    failed: string;
  }

  type TeamMembersAddJobStatus = AsyncPollResultBase | TeamMembersAddJobStatusComplete | TeamMembersAddJobStatusFailed;

  interface TeamMembersAddLaunchComplete {
    '.tag': 'complete';
    complete: Array<TeamMemberAddResult>;
  }

  type TeamMembersAddLaunch = AsyncLaunchResultBase | TeamMembersAddLaunchComplete;

  /**
   * Exactly one of team_member_id, email, or external_id must be provided to
   * identify the user account.
   */
  interface TeamMembersDeactivateArg {
    /**
     * Identity of user to remove/suspend.
     */
    user: TeamUserSelectorArg;
    /**
     * If provided, controls if the user's data will be deleted on their linked
     * devices.
     */
    wipe_data: boolean;
  }

  /**
   * The user is not a member of the team.
   */
  interface TeamMembersDeactivateErrorUserNotInTeam {
    '.tag': 'user_not_in_team';
  }

  interface TeamMembersDeactivateErrorOther {
    '.tag': 'other';
  }

  type TeamMembersDeactivateError = TeamUserSelectorError | TeamMembersDeactivateErrorUserNotInTeam | TeamMembersDeactivateErrorOther;

  interface TeamMembersGetInfoArgs {
    /**
     * List of team members.
     */
    members: Array<TeamUserSelectorArg>;
  }

  interface TeamMembersGetInfoErrorOther {
    '.tag': 'other';
  }

  type TeamMembersGetInfoError = TeamMembersGetInfoErrorOther;

  /**
   * An ID that was provided as a parameter to :route:`members/get_info`, and
   * did not match a corresponding user. This might be a team_member_id, an
   * email, or an external ID, depending on how the method was called.
   */
  interface TeamMembersGetInfoItemIdNotFound {
    '.tag': 'id_not_found';
    id_not_found: string;
  }

  /**
   * Info about a team member.
   */
  interface TeamMembersGetInfoItemMemberInfo {
    '.tag': 'member_info';
    member_info: TeamTeamMemberInfo;
  }

  /**
   * Describes a result obtained for a single user whose id was specified in the
   * parameter of :route:`members/get_info`.
   */
  type TeamMembersGetInfoItem = TeamMembersGetInfoItemIdNotFound | TeamMembersGetInfoItemMemberInfo;

  interface TeamMembersListArg {
    /**
     * Number of results to return per call.
     */
    limit: number;
    /**
     * Whether to return removed members.
     */
    include_removed: boolean;
  }

  interface TeamMembersListContinueArg {
    /**
     * Indicates from what point to get the next set of members.
     */
    cursor: string;
  }

  /**
   * The cursor is invalid.
   */
  interface TeamMembersListContinueErrorInvalidCursor {
    '.tag': 'invalid_cursor';
  }

  interface TeamMembersListContinueErrorOther {
    '.tag': 'other';
  }

  type TeamMembersListContinueError = TeamMembersListContinueErrorInvalidCursor | TeamMembersListContinueErrorOther;

  interface TeamMembersListErrorOther {
    '.tag': 'other';
  }

  type TeamMembersListError = TeamMembersListErrorOther;

  interface TeamMembersListResult {
    /**
     * List of team members.
     */
    members: Array<TeamTeamMemberInfo>;
    /**
     * Pass the cursor into :route:`members/list/continue` to obtain the
     * additional members.
     */
    cursor: string;
    /**
     * Is true if there are additional team members that have not been returned
     * yet. An additional call to :route:`members/list/continue` can retrieve
     * them.
     */
    has_more: boolean;
  }

  /**
   * Exactly one of team_member_id, email, or external_id must be provided to
   * identify the user account.
   */
  interface TeamMembersRecoverArg {
    /**
     * Identity of user to recover.
     */
    user: TeamUserSelectorArg;
  }

  /**
   * The user is not recoverable.
   */
  interface TeamMembersRecoverErrorUserUnrecoverable {
    '.tag': 'user_unrecoverable';
  }

  /**
   * The user is not a member of the team.
   */
  interface TeamMembersRecoverErrorUserNotInTeam {
    '.tag': 'user_not_in_team';
  }

  interface TeamMembersRecoverErrorOther {
    '.tag': 'other';
  }

  type TeamMembersRecoverError = TeamUserSelectorError | TeamMembersRecoverErrorUserUnrecoverable | TeamMembersRecoverErrorUserNotInTeam | TeamMembersRecoverErrorOther;

  interface TeamMembersRemoveArg extends TeamMembersDeactivateArg {
    /**
     * If provided, files from the deleted member account will be transferred to
     * this user.
     */
    transfer_dest_id?: TeamUserSelectorArg;
    /**
     * If provided, errors during the transfer process will be sent via email to
     * this user. If the transfer_dest_id argument was provided, then this
     * argument must be provided as well.
     */
    transfer_admin_id?: TeamUserSelectorArg;
    /**
     * Downgrade the member to a Basic account. The user will retain the email
     * address associated with their Dropbox  account and data in their account
     * that is not restricted to team members.
     */
    keep_account: boolean;
  }

  /**
   * The user is the last admin of the team, so it cannot be removed from it.
   */
  interface TeamMembersRemoveErrorRemoveLastAdmin {
    '.tag': 'remove_last_admin';
  }

  /**
   * Expected removed user and transfer_dest user to be different
   */
  interface TeamMembersRemoveErrorRemovedAndTransferDestShouldDiffer {
    '.tag': 'removed_and_transfer_dest_should_differ';
  }

  /**
   * Expected removed user and transfer_admin user to be different.
   */
  interface TeamMembersRemoveErrorRemovedAndTransferAdminShouldDiffer {
    '.tag': 'removed_and_transfer_admin_should_differ';
  }

  /**
   * No matching user found for the argument transfer_dest_id.
   */
  interface TeamMembersRemoveErrorTransferDestUserNotFound {
    '.tag': 'transfer_dest_user_not_found';
  }

  /**
   * The provided transfer_dest_id does not exist on this team.
   */
  interface TeamMembersRemoveErrorTransferDestUserNotInTeam {
    '.tag': 'transfer_dest_user_not_in_team';
  }

  /**
   * No matching user found for the argument transfer_admin_id.
   */
  interface TeamMembersRemoveErrorTransferAdminUserNotFound {
    '.tag': 'transfer_admin_user_not_found';
  }

  /**
   * The provided transfer_admin_id does not exist on this team.
   */
  interface TeamMembersRemoveErrorTransferAdminUserNotInTeam {
    '.tag': 'transfer_admin_user_not_in_team';
  }

  /**
   * The transfer_admin_id argument must be provided when file transfer is
   * requested.
   */
  interface TeamMembersRemoveErrorUnspecifiedTransferAdminId {
    '.tag': 'unspecified_transfer_admin_id';
  }

  /**
   * Specified transfer_admin user is not a team admin.
   */
  interface TeamMembersRemoveErrorTransferAdminIsNotAdmin {
    '.tag': 'transfer_admin_is_not_admin';
  }

  /**
   * Cannot keep account and transfer the data to another user at the same time.
   */
  interface TeamMembersRemoveErrorCannotKeepAccountAndTransfer {
    '.tag': 'cannot_keep_account_and_transfer';
  }

  /**
   * Cannot keep account and delete the data at the same time.
   */
  interface TeamMembersRemoveErrorCannotKeepAccountAndDeleteData {
    '.tag': 'cannot_keep_account_and_delete_data';
  }

  /**
   * The email address of the user is too long to be disabled.
   */
  interface TeamMembersRemoveErrorEmailAddressTooLongToBeDisabled {
    '.tag': 'email_address_too_long_to_be_disabled';
  }

  type TeamMembersRemoveError = TeamMembersDeactivateError | TeamMembersRemoveErrorRemoveLastAdmin | TeamMembersRemoveErrorRemovedAndTransferDestShouldDiffer | TeamMembersRemoveErrorRemovedAndTransferAdminShouldDiffer | TeamMembersRemoveErrorTransferDestUserNotFound | TeamMembersRemoveErrorTransferDestUserNotInTeam | TeamMembersRemoveErrorTransferAdminUserNotFound | TeamMembersRemoveErrorTransferAdminUserNotInTeam | TeamMembersRemoveErrorUnspecifiedTransferAdminId | TeamMembersRemoveErrorTransferAdminIsNotAdmin | TeamMembersRemoveErrorCannotKeepAccountAndTransfer | TeamMembersRemoveErrorCannotKeepAccountAndDeleteData | TeamMembersRemoveErrorEmailAddressTooLongToBeDisabled;

  interface TeamMembersSendWelcomeErrorOther {
    '.tag': 'other';
  }

  type TeamMembersSendWelcomeError = TeamMemberSelectorError | TeamMembersSendWelcomeErrorOther;

  /**
   * Exactly one of team_member_id, email, or external_id must be provided to
   * identify the user account.
   */
  interface TeamMembersSetPermissionsArg {
    /**
     * Identity of user whose role will be set.
     */
    user: TeamUserSelectorArg;
    /**
     * The new role of the member.
     */
    new_role: TeamAdminTier;
  }

  /**
   * Cannot remove the admin setting of the last admin.
   */
  interface TeamMembersSetPermissionsErrorLastAdmin {
    '.tag': 'last_admin';
  }

  /**
   * The user is not a member of the team.
   */
  interface TeamMembersSetPermissionsErrorUserNotInTeam {
    '.tag': 'user_not_in_team';
  }

  /**
   * Cannot remove/grant permissions.
   */
  interface TeamMembersSetPermissionsErrorCannotSetPermissions {
    '.tag': 'cannot_set_permissions';
  }

  /**
   * Team is full. The organization has no available licenses.
   */
  interface TeamMembersSetPermissionsErrorTeamLicenseLimit {
    '.tag': 'team_license_limit';
  }

  interface TeamMembersSetPermissionsErrorOther {
    '.tag': 'other';
  }

  type TeamMembersSetPermissionsError = TeamUserSelectorError | TeamMembersSetPermissionsErrorLastAdmin | TeamMembersSetPermissionsErrorUserNotInTeam | TeamMembersSetPermissionsErrorCannotSetPermissions | TeamMembersSetPermissionsErrorTeamLicenseLimit | TeamMembersSetPermissionsErrorOther;

  interface TeamMembersSetPermissionsResult {
    /**
     * The member ID of the user to which the change was applied.
     */
    team_member_id: string;
    /**
     * The role after the change.
     */
    role: TeamAdminTier;
  }

  /**
   * Exactly one of team_member_id, email, or external_id must be provided to
   * identify the user account. At least one of new_email, new_external_id,
   * new_given_name, and/or new_surname must be provided.
   */
  interface TeamMembersSetProfileArg {
    /**
     * Identity of user whose profile will be set.
     */
    user: TeamUserSelectorArg;
    /**
     * New email for member.
     */
    new_email?: string;
    /**
     * New external ID for member.
     */
    new_external_id?: string;
    /**
     * New given name for member.
     */
    new_given_name?: string;
    /**
     * New surname for member.
     */
    new_surname?: string;
  }

  /**
   * It is unsafe to use both external_id and new_external_id
   */
  interface TeamMembersSetProfileErrorExternalIdAndNewExternalIdUnsafe {
    '.tag': 'external_id_and_new_external_id_unsafe';
  }

  /**
   * None of new_email, new_given_name, new_surname, or new_external_id are
   * specified
   */
  interface TeamMembersSetProfileErrorNoNewDataSpecified {
    '.tag': 'no_new_data_specified';
  }

  /**
   * Email is already reserved for another user.
   */
  interface TeamMembersSetProfileErrorEmailReservedForOtherUser {
    '.tag': 'email_reserved_for_other_user';
  }

  /**
   * The external ID is already in use by another team member.
   */
  interface TeamMembersSetProfileErrorExternalIdUsedByOtherUser {
    '.tag': 'external_id_used_by_other_user';
  }

  /**
   * Setting profile disallowed
   */
  interface TeamMembersSetProfileErrorSetProfileDisallowed {
    '.tag': 'set_profile_disallowed';
  }

  /**
   * Parameter new_email cannot be empty.
   */
  interface TeamMembersSetProfileErrorParamCannotBeEmpty {
    '.tag': 'param_cannot_be_empty';
  }

  interface TeamMembersSetProfileErrorOther {
    '.tag': 'other';
  }

  type TeamMembersSetProfileError = TeamMemberSelectorError | TeamMembersSetProfileErrorExternalIdAndNewExternalIdUnsafe | TeamMembersSetProfileErrorNoNewDataSpecified | TeamMembersSetProfileErrorEmailReservedForOtherUser | TeamMembersSetProfileErrorExternalIdUsedByOtherUser | TeamMembersSetProfileErrorSetProfileDisallowed | TeamMembersSetProfileErrorParamCannotBeEmpty | TeamMembersSetProfileErrorOther;

  /**
   * The user is not active, so it cannot be suspended.
   */
  interface TeamMembersSuspendErrorSuspendInactiveUser {
    '.tag': 'suspend_inactive_user';
  }

  /**
   * The user is the last admin of the team, so it cannot be suspended.
   */
  interface TeamMembersSuspendErrorSuspendLastAdmin {
    '.tag': 'suspend_last_admin';
  }

  /**
   * Team is full. The organization has no available licenses.
   */
  interface TeamMembersSuspendErrorTeamLicenseLimit {
    '.tag': 'team_license_limit';
  }

  type TeamMembersSuspendError = TeamMembersDeactivateError | TeamMembersSuspendErrorSuspendInactiveUser | TeamMembersSuspendErrorSuspendLastAdmin | TeamMembersSuspendErrorTeamLicenseLimit;

  /**
   * Exactly one of team_member_id, email, or external_id must be provided to
   * identify the user account.
   */
  interface TeamMembersUnsuspendArg {
    /**
     * Identity of user to unsuspend.
     */
    user: TeamUserSelectorArg;
  }

  /**
   * The user is unsuspended, so it cannot be unsuspended again.
   */
  interface TeamMembersUnsuspendErrorUnsuspendNonSuspendedMember {
    '.tag': 'unsuspend_non_suspended_member';
  }

  /**
   * Team is full. The organization has no available licenses.
   */
  interface TeamMembersUnsuspendErrorTeamLicenseLimit {
    '.tag': 'team_license_limit';
  }

  type TeamMembersUnsuspendError = TeamMembersDeactivateError | TeamMembersUnsuspendErrorUnsuspendNonSuspendedMember | TeamMembersUnsuspendErrorTeamLicenseLimit;

  /**
   * Official Dropbox iPhone client
   */
  interface TeamMobileClientPlatformIphone {
    '.tag': 'iphone';
  }

  /**
   * Official Dropbox iPad client
   */
  interface TeamMobileClientPlatformIpad {
    '.tag': 'ipad';
  }

  /**
   * Official Dropbox Android client
   */
  interface TeamMobileClientPlatformAndroid {
    '.tag': 'android';
  }

  /**
   * Official Dropbox Windows phone client
   */
  interface TeamMobileClientPlatformWindowsPhone {
    '.tag': 'windows_phone';
  }

  /**
   * Official Dropbox Blackberry client
   */
  interface TeamMobileClientPlatformBlackberry {
    '.tag': 'blackberry';
  }

  interface TeamMobileClientPlatformOther {
    '.tag': 'other';
  }

  type TeamMobileClientPlatform = TeamMobileClientPlatformIphone | TeamMobileClientPlatformIpad | TeamMobileClientPlatformAndroid | TeamMobileClientPlatformWindowsPhone | TeamMobileClientPlatformBlackberry | TeamMobileClientPlatformOther;

  /**
   * Information about linked Dropbox mobile client sessions
   */
  interface TeamMobileClientSession extends TeamDeviceSession {
    /**
     * The device name
     */
    device_name: string;
    /**
     * The mobile application type
     */
    client_type: TeamMobileClientPlatform;
    /**
     * The dropbox client version
     */
    client_version?: string;
    /**
     * The hosting OS version
     */
    os_version?: string;
    /**
     * last carrier used by the device
     */
    last_carrier?: string;
  }

  interface TeamRemovedStatus {
    /**
     * True if the removed team member is recoverable
     */
    is_recoverable: boolean;
  }

  interface TeamRevokeDesktopClientArg extends TeamDeviceSessionArg {
    /**
     * Whether to delete all files of the account (this is possible only if
     * supported by the desktop client and  will be made the next time the
     * client access the account)
     */
    delete_on_unlink: boolean;
  }

  /**
   * End an active session
   */
  interface TeamRevokeDeviceSessionArgWebSession {
    '.tag': 'web_session';
    web_session: TeamDeviceSessionArg;
  }

  /**
   * Unlink a linked desktop device
   */
  interface TeamRevokeDeviceSessionArgDesktopClient {
    '.tag': 'desktop_client';
    desktop_client: TeamRevokeDesktopClientArg;
  }

  /**
   * Unlink a linked mobile device
   */
  interface TeamRevokeDeviceSessionArgMobileClient {
    '.tag': 'mobile_client';
    mobile_client: TeamDeviceSessionArg;
  }

  type TeamRevokeDeviceSessionArg = TeamRevokeDeviceSessionArgWebSession | TeamRevokeDeviceSessionArgDesktopClient | TeamRevokeDeviceSessionArgMobileClient;

  interface TeamRevokeDeviceSessionBatchArg {
    revoke_devices: Array<TeamRevokeDeviceSessionArg>;
  }

  interface TeamRevokeDeviceSessionBatchErrorOther {
    '.tag': 'other';
  }

  type TeamRevokeDeviceSessionBatchError = TeamRevokeDeviceSessionBatchErrorOther;

  interface TeamRevokeDeviceSessionBatchResult {
    revoke_devices_status: Array<TeamRevokeDeviceSessionStatus>;
  }

  /**
   * Device session not found.
   */
  interface TeamRevokeDeviceSessionErrorDeviceSessionNotFound {
    '.tag': 'device_session_not_found';
  }

  /**
   * Member not found.
   */
  interface TeamRevokeDeviceSessionErrorMemberNotFound {
    '.tag': 'member_not_found';
  }

  interface TeamRevokeDeviceSessionErrorOther {
    '.tag': 'other';
  }

  type TeamRevokeDeviceSessionError = TeamRevokeDeviceSessionErrorDeviceSessionNotFound | TeamRevokeDeviceSessionErrorMemberNotFound | TeamRevokeDeviceSessionErrorOther;

  interface TeamRevokeDeviceSessionStatus {
    /**
     * Result of the revoking request
     */
    success: boolean;
    /**
     * The error cause in case of a failure
     */
    error_type?: TeamRevokeDeviceSessionError;
  }

  interface TeamRevokeLinkedApiAppArg {
    /**
     * The application's unique id
     */
    app_id: string;
    /**
     * The unique id of the member owning the device
     */
    team_member_id: string;
    /**
     * Whether to keep the application dedicated folder (in case the application
     * uses  one)
     */
    keep_app_folder: boolean;
  }

  interface TeamRevokeLinkedApiAppBatchArg {
    revoke_linked_app: Array<TeamRevokeLinkedApiAppArg>;
  }

  interface TeamRevokeLinkedAppBatchErrorOther {
    '.tag': 'other';
  }

  /**
   * Error returned by :route:`linked_apps/revoke_linked_app_batch`.
   */
  type TeamRevokeLinkedAppBatchError = TeamRevokeLinkedAppBatchErrorOther;

  interface TeamRevokeLinkedAppBatchResult {
    revoke_linked_app_status: Array<TeamRevokeLinkedAppStatus>;
  }

  /**
   * Application not found.
   */
  interface TeamRevokeLinkedAppErrorAppNotFound {
    '.tag': 'app_not_found';
  }

  /**
   * Member not found.
   */
  interface TeamRevokeLinkedAppErrorMemberNotFound {
    '.tag': 'member_not_found';
  }

  interface TeamRevokeLinkedAppErrorOther {
    '.tag': 'other';
  }

  /**
   * Error returned by :route:`linked_apps/revoke_linked_app`.
   */
  type TeamRevokeLinkedAppError = TeamRevokeLinkedAppErrorAppNotFound | TeamRevokeLinkedAppErrorMemberNotFound | TeamRevokeLinkedAppErrorOther;

  interface TeamRevokeLinkedAppStatus {
    /**
     * Result of the revoking request
     */
    success: boolean;
    /**
     * The error cause in case of a failure
     */
    error_type?: TeamRevokeLinkedAppError;
  }

  /**
   * Describes the number of users in a specific storage bucket.
   */
  interface TeamStorageBucket {
    /**
     * The name of the storage bucket. For example, '1G' is a bucket of users
     * with storage size up to 1 Giga.
     */
    bucket: string;
    /**
     * The number of people whose storage is in the range of this storage
     * bucket.
     */
    users: number;
  }

  interface TeamTeamGetInfoResult {
    /**
     * The name of the team.
     */
    name: string;
    /**
     * The ID of the team.
     */
    team_id: string;
    /**
     * The number of licenses available to the team.
     */
    num_licensed_users: number;
    /**
     * The number of accounts that have been invited or are already active
     * members of the team.
     */
    num_provisioned_users: number;
    policies: Team_policiesTeamMemberPolicies;
  }

  /**
   * Information about a team member.
   */
  interface TeamTeamMemberInfo {
    /**
     * Profile of a user as a member of a team.
     */
    profile: TeamTeamMemberProfile;
    /**
     * The user's role in the team.
     */
    role: TeamAdminTier;
  }

  /**
   * Profile of a user as a member of a team.
   */
  interface TeamTeamMemberProfile extends TeamMemberProfile {
    /**
     * List of group IDs of groups that the user belongs to.
     */
    groups: Array<Object>;
  }

  /**
   * User has successfully joined the team.
   */
  interface TeamTeamMemberStatusActive {
    '.tag': 'active';
  }

  /**
   * User has been invited to a team, but has not joined the team yet.
   */
  interface TeamTeamMemberStatusInvited {
    '.tag': 'invited';
  }

  /**
   * User is no longer a member of the team, but the account can be
   * un-suspended, re-establishing the user as a team member.
   */
  interface TeamTeamMemberStatusSuspended {
    '.tag': 'suspended';
  }

  /**
   * User is no longer a member of the team. Removed users are only listed when
   * include_removed is true in members/list.
   */
  interface TeamTeamMemberStatusRemoved {
    '.tag': 'removed';
    removed: TeamRemovedStatus;
  }

  /**
   * The user's status as a member of a specific team.
   */
  type TeamTeamMemberStatus = TeamTeamMemberStatusActive | TeamTeamMemberStatusInvited | TeamTeamMemberStatusSuspended | TeamTeamMemberStatusRemoved;

  /**
   * User uses a license and has full access to team resources like the shared
   * quota.
   */
  interface TeamTeamMembershipTypeFull {
    '.tag': 'full';
  }

  /**
   * User does not have access to the shared quota and team admins have
   * restricted administrative control.
   */
  interface TeamTeamMembershipTypeLimited {
    '.tag': 'limited';
  }

  type TeamTeamMembershipType = TeamTeamMembershipTypeFull | TeamTeamMembershipTypeLimited;

  interface TeamUpdatePropertyTemplateArg {
    /**
     * An identifier for property template added by
     * :route:`properties/template/add`.
     */
    template_id: string;
    /**
     * A display name for the property template. Property template names can be
     * up to 256 bytes.
     */
    name?: string;
    /**
     * Description for new property template. Property template descriptions can
     * be up to 1024 bytes.
     */
    description?: string;
    /**
     * This is a list of custom properties to add to the property template.
     * There can be up to 64 properties in a single property template.
     */
    add_fields?: Array<PropertiesPropertyFieldTemplate>;
  }

  interface TeamUpdatePropertyTemplateResult {
    /**
     * An identifier for property template added by
     * :route:`properties/template/add`.
     */
    template_id: string;
  }

  interface TeamUserSelectorArgTeamMemberId {
    '.tag': 'team_member_id';
    team_member_id: string;
  }

  interface TeamUserSelectorArgExternalId {
    '.tag': 'external_id';
    external_id: string;
  }

  interface TeamUserSelectorArgEmail {
    '.tag': 'email';
    email: string;
  }

  /**
   * Argument for selecting a single user, either by team_member_id, external_id
   * or email.
   */
  type TeamUserSelectorArg = TeamUserSelectorArgTeamMemberId | TeamUserSelectorArgExternalId | TeamUserSelectorArgEmail;

  /**
   * No matching user found. The provided team_member_id, email, or external_id
   * does not exist on this team.
   */
  interface TeamUserSelectorErrorUserNotFound {
    '.tag': 'user_not_found';
  }

  /**
   * Error that can be returned whenever a struct derived from
   * :type:`UserSelectorArg` is used.
   */
  type TeamUserSelectorError = TeamUserSelectorErrorUserNotFound;

  /**
   * List of member IDs.
   */
  interface TeamUsersSelectorArgTeamMemberIds {
    '.tag': 'team_member_ids';
    team_member_ids: Array<Object>;
  }

  /**
   * List of external user IDs.
   */
  interface TeamUsersSelectorArgExternalIds {
    '.tag': 'external_ids';
    external_ids: Array<Object>;
  }

  /**
   * List of email addresses.
   */
  interface TeamUsersSelectorArgEmails {
    '.tag': 'emails';
    emails: Array<Object>;
  }

  /**
   * Argument for selecting a list of users, either by team_member_ids,
   * external_ids or emails.
   */
  type TeamUsersSelectorArg = TeamUsersSelectorArgTeamMemberIds | TeamUsersSelectorArgExternalIds | TeamUsersSelectorArgEmails;

  /**
   * A group which is managed by team admins only.
   */
  interface Team_commonGroupManagementTypeCompanyManaged {
    '.tag': 'company_managed';
  }

  /**
   * A group which is managed by selected users.
   */
  interface Team_commonGroupManagementTypeUserManaged {
    '.tag': 'user_managed';
  }

  interface Team_commonGroupManagementTypeOther {
    '.tag': 'other';
  }

  /**
   * The group type determines how a group is managed.
   */
  type Team_commonGroupManagementType = Team_commonGroupManagementTypeCompanyManaged | Team_commonGroupManagementTypeUserManaged | Team_commonGroupManagementTypeOther;

  /**
   * Information about a group.
   */
  interface Team_commonGroupSummary {
    group_name: string;
    group_id: string;
    /**
     * External ID of group. This is an arbitrary ID that an admin can attach to
     * a group.
     */
    group_external_id?: string;
    /**
     * The number of members in the group.
     */
    member_count?: number;
    /**
     * Who is allowed to manage the group.
     */
    group_management_type: Team_commonGroupManagementType;
  }

  /**
   * A group to which team members are automatically added. Applicable to
   * :link:`team folders https://www.dropbox.com/help/986` only.
   */
  interface Team_commonGroupTypeTeam {
    '.tag': 'team';
  }

  /**
   * A group is created and managed by a user.
   */
  interface Team_commonGroupTypeUserManaged {
    '.tag': 'user_managed';
  }

  interface Team_commonGroupTypeOther {
    '.tag': 'other';
  }

  /**
   * The group type determines how a group is created and managed.
   */
  type Team_commonGroupType = Team_commonGroupTypeTeam | Team_commonGroupTypeUserManaged | Team_commonGroupTypeOther;

  /**
   * Emm token is disabled
   */
  interface Team_policiesEmmStateDisabled {
    '.tag': 'disabled';
  }

  /**
   * Emm token is optional
   */
  interface Team_policiesEmmStateOptional {
    '.tag': 'optional';
  }

  /**
   * Emm token is required
   */
  interface Team_policiesEmmStateRequired {
    '.tag': 'required';
  }

  interface Team_policiesEmmStateOther {
    '.tag': 'other';
  }

  type Team_policiesEmmState = Team_policiesEmmStateDisabled | Team_policiesEmmStateOptional | Team_policiesEmmStateRequired | Team_policiesEmmStateOther;

  /**
   * Team members can only join folders shared by teammates.
   */
  interface Team_policiesSharedFolderJoinPolicyFromTeamOnly {
    '.tag': 'from_team_only';
  }

  /**
   * Team members can join any shared folder, including those shared by users
   * outside the team.
   */
  interface Team_policiesSharedFolderJoinPolicyFromAnyone {
    '.tag': 'from_anyone';
  }

  interface Team_policiesSharedFolderJoinPolicyOther {
    '.tag': 'other';
  }

  /**
   * Policy governing which shared folders a team member can join.
   */
  type Team_policiesSharedFolderJoinPolicy = Team_policiesSharedFolderJoinPolicyFromTeamOnly | Team_policiesSharedFolderJoinPolicyFromAnyone | Team_policiesSharedFolderJoinPolicyOther;

  /**
   * Only a teammate can be a member of a folder shared by a team member.
   */
  interface Team_policiesSharedFolderMemberPolicyTeam {
    '.tag': 'team';
  }

  /**
   * Anyone can be a member of a folder shared by a team member.
   */
  interface Team_policiesSharedFolderMemberPolicyAnyone {
    '.tag': 'anyone';
  }

  interface Team_policiesSharedFolderMemberPolicyOther {
    '.tag': 'other';
  }

  /**
   * Policy governing who can be a member of a folder shared by a team member.
   */
  type Team_policiesSharedFolderMemberPolicy = Team_policiesSharedFolderMemberPolicyTeam | Team_policiesSharedFolderMemberPolicyAnyone | Team_policiesSharedFolderMemberPolicyOther;

  /**
   * By default, anyone can access newly created shared links. No login will be
   * required to access the shared links unless overridden.
   */
  interface Team_policiesSharedLinkCreatePolicyDefaultPublic {
    '.tag': 'default_public';
  }

  /**
   * By default, only members of the same team can access newly created shared
   * links. Login will be required to access the shared links unless overridden.
   */
  interface Team_policiesSharedLinkCreatePolicyDefaultTeamOnly {
    '.tag': 'default_team_only';
  }

  /**
   * Only members of the same team can access newly created shared links. Login
   * will be required to access the shared links.
   */
  interface Team_policiesSharedLinkCreatePolicyTeamOnly {
    '.tag': 'team_only';
  }

  interface Team_policiesSharedLinkCreatePolicyOther {
    '.tag': 'other';
  }

  /**
   * Policy governing the visibility of newly created shared links.
   */
  type Team_policiesSharedLinkCreatePolicy = Team_policiesSharedLinkCreatePolicyDefaultPublic | Team_policiesSharedLinkCreatePolicyDefaultTeamOnly | Team_policiesSharedLinkCreatePolicyTeamOnly | Team_policiesSharedLinkCreatePolicyOther;

  /**
   * Policies governing team members.
   */
  interface Team_policiesTeamMemberPolicies {
    /**
     * Policies governing sharing.
     */
    sharing: Team_policiesTeamSharingPolicies;
    /**
     * This describes the Enterprise Mobility Management (EMM) state for this
     * team. This information can be used to understand if an organization is
     * integrating with a third-party EMM vendor to further manage and apply
     * restrictions upon the team's Dropbox usage on mobile devices. This is a
     * new feature and in the future we'll be adding more new fields and
     * additional documentation.
     */
    emm_state: Team_policiesEmmState;
  }

  /**
   * Policies governing sharing within and outside of the team.
   */
  interface Team_policiesTeamSharingPolicies {
    /**
     * Who can join folders shared by team members.
     */
    shared_folder_member_policy: Team_policiesSharedFolderMemberPolicy;
    /**
     * Which shared folders team members can join.
     */
    shared_folder_join_policy: Team_policiesSharedFolderJoinPolicy;
    /**
     * What is the visibility of newly created shared links.
     */
    shared_link_create_policy: Team_policiesSharedLinkCreatePolicy;
  }

  /**
   * The amount of detail revealed about an account depends on the user being
   * queried and the user making the query.
   */
  interface UsersAccount {
    /**
     * The user's unique Dropbox ID.
     */
    account_id: string;
    /**
     * Details of a user's name.
     */
    name: UsersName;
    /**
     * The user's e-mail address. Do not rely on this without checking the
     * :field:`email_verified` field. Even then, it's possible that the user has
     * since lost access to their e-mail.
     */
    email: string;
    /**
     * Whether the user has verified their e-mail address.
     */
    email_verified: boolean;
    /**
     * URL for the photo representing the user, if one is set.
     */
    profile_photo_url?: string;
    /**
     * Whether the user has been disabled.
     */
    disabled: boolean;
  }

  /**
   * The basic account type.
   */
  interface UsersAccountTypeBasic {
    '.tag': 'basic';
  }

  /**
   * The Dropbox Pro account type.
   */
  interface UsersAccountTypePro {
    '.tag': 'pro';
  }

  /**
   * The Dropbox Business account type.
   */
  interface UsersAccountTypeBusiness {
    '.tag': 'business';
  }

  /**
   * What type of account this user has.
   */
  type UsersAccountType = UsersAccountTypeBasic | UsersAccountTypePro | UsersAccountTypeBusiness;

  /**
   * Basic information about any account.
   */
  interface UsersBasicAccount extends UsersAccount {
    /**
     * Whether this user is a teammate of the current user. If this account is
     * the current user's account, then this will be :val:`true`.
     */
    is_teammate: boolean;
    /**
     * The user's unique team member id. This field will only be present if the
     * user is part of a team and :field:`is_teammate` is :val:`true`.
     */
    team_member_id?: string;
  }

  /**
   * Detailed information about the current user's account.
   */
  interface UsersFullAccount extends UsersAccount {
    /**
     * The user's two-letter country code, if available. Country codes are based
     * on :link:`ISO 3166-1 http://en.wikipedia.org/wiki/ISO_3166-1`.
     */
    country?: string;
    /**
     * The language that the user specified. Locale tags will be :link:`IETF
     * language tags http://en.wikipedia.org/wiki/IETF_language_tag`.
     */
    locale: string;
    /**
     * The user's :link:`referral link https://www.dropbox.com/referrals`.
     */
    referral_link: string;
    /**
     * If this account is a member of a team, information about that team.
     */
    team?: UsersFullTeam;
    /**
     * This account's unique team member id. This field will only be present if
     * :field:`team` is present.
     */
    team_member_id?: string;
    /**
     * Whether the user has a personal and work account. If the current account
     * is personal, then :field:`team` will always be :val:`null`, but
     * :field:`is_paired` will indicate if a work account is linked.
     */
    is_paired: boolean;
    /**
     * What type of account this user has.
     */
    account_type: UsersAccountType;
  }

  /**
   * Detailed information about a team.
   */
  interface UsersFullTeam extends UsersTeam {
    /**
     * Team policies governing sharing.
     */
    sharing_policies: Team_policiesTeamSharingPolicies;
  }

  interface UsersGetAccountArg {
    /**
     * A user's account identifier.
     */
    account_id: string;
  }

  interface UsersGetAccountBatchArg {
    /**
     * List of user account identifiers.  Should not contain any duplicate
     * account IDs.
     */
    account_ids: Array<Object>;
  }

  /**
   * The value is an account ID specified in
   * :field:`GetAccountBatchArg.account_ids` that does not exist.
   */
  interface UsersGetAccountBatchErrorNoAccount {
    '.tag': 'no_account';
    no_account: string;
  }

  interface UsersGetAccountBatchErrorOther {
    '.tag': 'other';
  }

  type UsersGetAccountBatchError = UsersGetAccountBatchErrorNoAccount | UsersGetAccountBatchErrorOther;

  /**
   * The specified :field:`GetAccountArg.account_id` does not exist.
   */
  interface UsersGetAccountErrorNoAccount {
    '.tag': 'no_account';
  }

  interface UsersGetAccountErrorOther {
    '.tag': 'other';
  }

  type UsersGetAccountError = UsersGetAccountErrorNoAccount | UsersGetAccountErrorOther;

  interface UsersIndividualSpaceAllocation {
    /**
     * The total space allocated to the user's account (bytes).
     */
    allocated: number;
  }

  /**
   * Representations for a person's name to assist with internationalization.
   */
  interface UsersName {
    /**
     * Also known as a first name.
     */
    given_name: string;
    /**
     * Also known as a last name or family name.
     */
    surname: string;
    /**
     * Locale-dependent name. In the US, a person's familiar name is their
     * :field:`given_name`, but elsewhere, it could be any combination of a
     * person's :field:`given_name` and :field:`surname`.
     */
    familiar_name: string;
    /**
     * A name that can be used directly to represent the name of a user's
     * Dropbox account.
     */
    display_name: string;
    /**
     * An abbreviated form of the person's name. Their initials in most locales.
     */
    abbreviated_name: string;
  }

  /**
   * The user's space allocation applies only to their individual account.
   */
  interface UsersSpaceAllocationIndividual {
    '.tag': 'individual';
    individual: UsersIndividualSpaceAllocation;
  }

  /**
   * The user shares space with other members of their team.
   */
  interface UsersSpaceAllocationTeam {
    '.tag': 'team';
    team: UsersTeamSpaceAllocation;
  }

  interface UsersSpaceAllocationOther {
    '.tag': 'other';
  }

  /**
   * Space is allocated differently based on the type of account.
   */
  type UsersSpaceAllocation = UsersSpaceAllocationIndividual | UsersSpaceAllocationTeam | UsersSpaceAllocationOther;

  /**
   * Information about a user's space usage and quota.
   */
  interface UsersSpaceUsage {
    /**
     * The user's total space usage (bytes).
     */
    used: number;
    /**
     * The user's space allocation.
     */
    allocation: UsersSpaceAllocation;
  }

  /**
   * Information about a team.
   */
  interface UsersTeam {
    /**
     * The team's unique ID.
     */
    id: string;
    /**
     * The name of the team.
     */
    name: string;
  }

  interface UsersTeamSpaceAllocation {
    /**
     * The total space currently used by the user's team (bytes).
     */
    used: number;
    /**
     * The total space allocated to the user's team (bytes).
     */
    allocated: number;
  }

}

declare var Dropbox: DropboxTypes.Dropbox;

declare module "dropbox" {
  export = DropboxTypes.Dropbox;
}
