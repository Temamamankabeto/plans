import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accessMappingService } from "@/services/access-mapping/access-mapping.service";
import type { AccessMappingPayload } from "@/types/access-mapping/access-mapping.type";
const key=["organization-access-mappings"] as const;
export function useAccessMappingsQuery(){return useQuery({queryKey:key,queryFn:()=>accessMappingService.list()});}
export function useAccessScopeOptionsQuery(scopeType:"crop_type"|"livestock_product"){
 return useQuery({
  queryKey:["organization-access-mapping-scope-options",scopeType],
  queryFn:()=>accessMappingService.scopeOptions(scopeType),
  enabled:Boolean(scopeType),
 });
}
export function useCreateAccessMappingMutation(onSuccess?:()=>void){const qc=useQueryClient();return useMutation({mutationFn:(p:AccessMappingPayload)=>accessMappingService.create(p),onSuccess:async()=>{await qc.invalidateQueries({queryKey:key});onSuccess?.();}});}
export function useUpdateAccessMappingMutation(onSuccess?:()=>void){const qc=useQueryClient();return useMutation({mutationFn:({id,payload}:{id:number;payload:AccessMappingPayload})=>accessMappingService.update(id,payload),onSuccess:async()=>{await qc.invalidateQueries({queryKey:key});onSuccess?.();}});}
export function useDeleteAccessMappingMutation(){const qc=useQueryClient();return useMutation({mutationFn:(id:number)=>accessMappingService.remove(id),onSuccess:()=>qc.invalidateQueries({queryKey:key})});}
