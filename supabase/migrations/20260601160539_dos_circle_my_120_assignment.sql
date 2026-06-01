alter type public.dos_circle_assignment
  add value if not exists 'my_120' after 'seventy';

comment on type public.dos_circle_assignment is
  'DOS Circle Engine assignment enum. Field remains the internal outside-focused-circles bucket.';
