import React, { useState, useMemo, Fragment } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
  type ColumnDef,
  ColumnFiltersState,
  FilterFn,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, Check, X as XIcon, Search } from 'lucide-react';
import { Combobox, Transition } from '@headlessui/react';
import Pagination from './Pagination';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  itemsPerPage?: number;
  enabledFilters?: string[];
}

declare module '@tanstack/react-table' {
  interface FilterFns {
    array: FilterFn<unknown>;
  }
}

// Custom filter function for array values - using OR logic within each column
const arrayFilter: FilterFn<any> = (row, columnId, filterValue) => {
  if (!filterValue?.length) return true; // If no filters selected, show all
  const value = row.getValue(columnId);
  return filterValue.includes(value); // Show if value matches ANY of the selected filters
};

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, onRemove }) => (
  <span 
    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full 
    bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 
    border border-blue-200/50 dark:border-blue-800/50
    shadow-sm transition-all duration-150 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
  >
    {label}
    <button
      onClick={onRemove}
      className="group rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800/50 
      transition-colors duration-150"
      aria-label={`Remove ${label} filter`}
    >
      <XIcon className="h-3 w-3 transition-transform duration-150 group-hover:scale-110" />
    </button>
  </span>
);

export function DataTable<T>({ 
  data, 
  columns, 
  itemsPerPage = 10,
  enabledFilters = ['company', 'location', 'status']
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

  // Get unique values for multiselect filters
  const filterOptions = useMemo(() => {
    const options: Record<string, Set<string>> = {};
    enabledFilters.forEach(filter => {
      options[filter] = new Set(data.map((item: any) => item[filter]));
    });
    return options;
  }, [data, enabledFilters]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    filterFns: {
      array: arrayFilter,
    },
  });

  // Calculate pagination
  const totalPages = Math.ceil(table.getFilteredRowModel().rows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRows = table.getFilteredRowModel().rows.slice(startIndex, endIndex);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [columnFilters]);

  return (
    <div className="space-y-6">
      {/* Filter section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {table.getAllColumns()
          .filter(column => enabledFilters.includes(column.id))
          .map(column => {
            const filterValue = column.getFilterValue() as string[] || [];
            const options = Array.from(filterOptions[column.id] || []).sort();
            const query = searchQueries[column.id] || '';
            const filteredOptions = options.filter(option => 
              option.toLowerCase().includes(query.toLowerCase())
            );

            return (
              <div key={column.id} className="space-y-3">
                <Combobox
                  as="div"
                  value={filterValue}
                  onChange={value => column.setFilterValue(value)}
                  multiple
                >
                  <div className="relative">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                      <Combobox.Input
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 
                        rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                        placeholder-gray-400 dark:placeholder-gray-500
                        focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 
                        focus:border-blue-500 dark:focus:border-blue-400
                        transition-shadow duration-150"
                        placeholder={`Filter by ${column.id.toLowerCase()}`}
                        onChange={(e) => setSearchQueries(prev => ({
                          ...prev,
                          [column.id]: e.target.value
                        }))}
                        displayValue={() => searchQueries[column.id] || ''}
                      />
                    </div>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                      afterLeave={() => setSearchQueries(prev => ({ ...prev, [column.id]: '' }))}
                    >
                      <Combobox.Options 
                        className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 
                        border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg 
                        max-h-60 overflow-auto focus:outline-none text-sm
                        divide-y divide-gray-100 dark:divide-gray-700"
                      >
                        <div className="p-2 space-y-1">
                          {filteredOptions.map((option) => (
                            <Combobox.Option
                              key={option}
                              value={option}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-2 pl-8 pr-3 rounded-md
                                ${active
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                  : 'text-gray-900 dark:text-white'
                                } transition-colors duration-150`
                              }
                            >
                              {({ selected, active }) => (
                                <>
                                  <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                    {option}
                                  </span>
                                  {selected && (
                                    <span 
                                      className={`absolute inset-y-0 left-0 flex items-center pl-2
                                        ${active ? 'text-blue-600 dark:text-blue-400' : 'text-blue-500 dark:text-blue-500'}`}
                                    >
                                      <Check className="h-4 w-4" />
                                    </span>
                                  )}
                                </>
                              )}
                            </Combobox.Option>
                          ))}
                          {filteredOptions.length === 0 && query !== '' && (
                            <div className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                              No matches found
                            </div>
                          )}
                        </div>
                      </Combobox.Options>
                    </Transition>
                  </div>
                </Combobox>

                {/* Filter chips */}
                {filterValue.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {filterValue.map((value) => (
                      <FilterChip
                        key={value}
                        label={value}
                        onRemove={() => {
                          column.setFilterValue(
                            filterValue.filter(v => v !== value)
                          );
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 
        shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="bg-gray-50 dark:bg-gray-800/50">
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 
                      uppercase tracking-wider"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-1.5 group ${
                            header.column.getCanSort() 
                              ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200' 
                              : ''
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className="inline-flex transition-opacity duration-150">
                            {{
                              asc: <ChevronUp className="h-3.5 w-3.5" />,
                              desc: <ChevronDown className="h-3.5 w-3.5" />,
                            }[header.column.getIsSorted() as string] ?? (
                              header.column.getCanSort() && (
                                <ChevronUp className="h-3.5 w-3.5 opacity-0 group-hover:opacity-30" />
                              )
                            )}
                          </span>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No results found
                  </td>
                </tr>
              ) : (
                paginatedRows.map(row => (
                  <tr 
                    key={row.id} 
                    className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-3 py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export type { ColumnDef }; 