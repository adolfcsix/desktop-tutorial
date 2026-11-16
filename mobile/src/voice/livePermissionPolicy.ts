/** Mirrors the Stage authority boundary. This only controls visibility;
 * the backend remains the source of truth for every sensitive mutation. */
import type {LiveMember} from '../services/api';
export type LiveModerationAction='kick'|'ban'|'unban'|'promote'|'demote'|'mute-chat'|'unmute-chat';
type Role=LiveMember['role'];
export function mayManageLiveMember(actor:Role|undefined,actorId:string|undefined,target:Pick<LiveMember,'id'|'role'>,hostId:string):boolean{
 if(!actorId||target.id===actorId||target.id===hostId)return false;
 return actor==='host'||(actor==='moderator'&&target.role==='listener');
}
export function mayModerateLiveMember(actor:Role|undefined,actorId:string|undefined,target:Pick<LiveMember,'id'|'role'>,hostId:string,action:LiveModerationAction):boolean{
 if(!mayManageLiveMember(actor,actorId,target,hostId))return false;
 if(['promote','demote','unban'].includes(action)&&actor!=='host')return false;
 if(action==='promote')return target.role==='listener';
 if(action==='demote')return target.role==='moderator';
 return true;
}
