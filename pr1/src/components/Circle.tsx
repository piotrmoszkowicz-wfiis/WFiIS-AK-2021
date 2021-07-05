import React from "react";

const mapCellToClassName = (value: 0 | 1 | 2): string => {
  switch (value) {
    case 0:
      return "bg-red-600";
    case 1:
      return "bg-green-500";
    case 2:
      return "bg-blue-500";
    default:
      return "";
  }
};

interface Props {
  value: 0 | 1 | 2;
}

const Circle: React.FC<Props> = ({ value }) => (
  <span
    className={`${mapCellToClassName(value)} w-2 h-2 rounded-full inline-block`}
  />
);

export default Circle;
