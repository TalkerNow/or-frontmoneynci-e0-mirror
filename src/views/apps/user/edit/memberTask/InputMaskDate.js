import React from "react"
import InputMask from "react-input-mask"
import {Label} from "reactstrap";

const InputMaskDate = ({ defaultValue, onChange }) => {
  var lstDate = null;
  var sDefaultValue = "";

  if(defaultValue != null) {
      lstDate = defaultValue.split("-");
      sDefaultValue = lstDate[2] + "/" + lstDate[1] + "/" + lstDate[0];
  }
  return (
    <React.Fragment>
      <InputMask
        className="form-control"
        mask="99/99/9999"
        placeholder="dd/mm/yyyy - End Date"
        onChange={onChange} defaultValue={sDefaultValue}
      />
    </React.Fragment>
  )
}

export default InputMaskDate
