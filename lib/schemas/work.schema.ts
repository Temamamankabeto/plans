export type WorkInput={work_type_id?:string|number;source_type?:string;crop_id?:string|number|null;crop_category_id?:string|number|null;livestock_product_id?:string|number|null;name?:string;code?:string;unit?:string;description?:string;is_active?:boolean|number|string};
export type WorkValidationResult=
 | {valid:true;data:{work_type_id:number|null;source_type:"crop"|"livestock";crop_id:number|null;crop_category_id:number|null;livestock_product_id:number|null;name:string;code:string;unit:string;description:string;is_active:boolean};errors:Record<string,never>}
 | {valid:false;data:null;errors:Record<string,string>};
function normalizeActive(value:unknown){return !(value==="inactive"||value===false||value===0||value==="0"||value==="false");}
export function validateWorkInput(input:WorkInput):WorkValidationResult{
  const rawWorkTypeId=input.work_type_id; const workTypeId=rawWorkTypeId?Number(rawWorkTypeId):null, source=String(input.source_type??""); const name=String(input.name??"").trim(); const errors:Record<string,string>={};
  const cropId=input.crop_id?Number(input.crop_id):null, cropCategoryId=input.crop_category_id?Number(input.crop_category_id):null, livestockId=input.livestock_product_id?Number(input.livestock_product_id):null;
  if(source!=="crop"&&source!=="livestock") errors.source_type="Product source is required";
  if(!name) errors.name="Product name is required"; else if(name.length<2) errors.name="Product name must be at least 2 characters"; else if(name.length>191) errors.name="Product name may not be greater than 191 characters";
  if(Object.keys(errors).length)return{valid:false,data:null,errors};
  return{valid:true,data:{work_type_id:workTypeId,source_type:source as "crop"|"livestock",crop_id:source==="crop"?cropId:null,crop_category_id:source==="crop"?cropCategoryId:null,livestock_product_id:source==="livestock"?livestockId:null,name,code:String(input.code??"").trim(),unit:String(input.unit??"").trim(),description:String(input.description??"").trim(),is_active:normalizeActive(input.is_active??true)},errors:{}};
}
