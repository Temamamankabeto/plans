import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accessMappingService } from "@/services/access-mapping/access-mapping.service";
import type { AccessMappingPayload, AccessScopeType } from "@/types/access-mapping/access-mapping.type";
const key=["organization-access-mappings"] as const;
export function useAccessMappingsQuery(){return useQuery({queryKey:key,queryFn:()=>accessMappingService.list()});}
export function useAccessOrganizationOptionsQuery(){return useQuery({queryKey:["organization-access-mapping-organization-options"],queryFn:()=>accessMappingService.organizationOptions(),staleTime:60_000});}
export function useAccessProductParentsQuery(scopeType:AccessScopeType){
 return useQuery({queryKey:["organization-access-mapping-product-parents",scopeType],queryFn:()=>accessMappingService.productParents(scopeType),enabled:scopeType==="crop_product"||scopeType==="livestock_product",staleTime:60_000});
}
export function useAccessScopeOptionsQuery(scopeType:AccessScopeType,parentIds?:number[]){
 const isProduct=scopeType==="crop_product"||scopeType==="livestock_product";
 const ids=[...(parentIds??[])].sort((a,b)=>a-b);
 return useQuery({queryKey:["organization-access-mapping-scope-options",scopeType,ids],queryFn:()=>accessMappingService.scopeOptions(scopeType,ids),enabled:Boolean(scopeType)&&scopeType!=="all"&&scopeType!=="trade_group"&&(!isProduct||ids.length>0)});
}
export function useCreateAccessMappingMutation(onSuccess?:()=>void){const qc=useQueryClient();return useMutation({mutationFn:(p:AccessMappingPayload)=>accessMappingService.create(p),onSuccess:async()=>{await qc.invalidateQueries({queryKey:key});onSuccess?.();}});}
export function useUpdateAccessMappingMutation(onSuccess?:()=>void){const qc=useQueryClient();return useMutation({mutationFn:({id,payload}:{id:number;payload:AccessMappingPayload})=>accessMappingService.update(id,payload),onSuccess:async()=>{await qc.invalidateQueries({queryKey:key});onSuccess?.();}});}
export function useDeleteAccessMappingMutation(){const qc=useQueryClient();return useMutation({mutationFn:(id:number)=>accessMappingService.remove(id),onSuccess:()=>qc.invalidateQueries({queryKey:key})});}
