import { forwardRef } from 'react';
import Input from '../ui/Input.jsx';

// forwardRef is required so that react-hook-form's register() ref
// (applied via spread) reaches the underlying <input> DOM element.
// Without it, React 18 strips the ref before FormField receives props,
// RHF never registers the input, and form submission never fires.
const FormField = forwardRef(({ error, ...props }, ref) => (
  <Input ref={ref} error={error?.message} {...props} />
));

FormField.displayName = 'FormField';
export default FormField;
