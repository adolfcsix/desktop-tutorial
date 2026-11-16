/** Permission to publish a track is the intersection of server stage rights and
 * LiveKit's current participant permission. A granted microphone seat must not
 * imply permission to publish camera. Source-limited token grants are enforced
 * even when canPublish is true. Never enable capture in this policy. */
import type {LiveRoster} from '../services/api';

export type PublishPermission={canPublish?:boolean;canPublishSources?:readonly string[]}|boolean|null|undefined;
function permitsSource(permission:PublishPermission,source:'microphone'|'camera'){
 if(permission===false)return false;
 if(permission===true||permission==null)return true;
 if(permission.canPublish===false)return false;
 // LiveKit's absent/empty list represents an unrestricted source set.
 const sources=permission.canPublishSources;
 return !sources?.length||sources.includes(source);
}
export function captureAllowance(roster:LiveRoster|null,permission:PublishPermission){
 if(!roster)return {mic:false,camera:false};
 const self=roster.members.find(member=>member.id===roster.selfId);
 return {
  mic:!!self?.speaker&&permitsSource(permission,'microphone'),
  camera:roster.type==='cam'&&!!self?.cameraAllowed&&permitsSource(permission,'camera'),
 };
}
