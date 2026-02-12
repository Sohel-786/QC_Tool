"use client";

import { useState, useMemo } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Eye, AlertCircle, Loader2 } from "lucide-react";
import { Item, ItemCategory } from "@/types";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ItemSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  categories: ItemCategory[];
  selectedCategoryId: number | null;
  onSelectItem: (item: Item) => void;
  isLoading?: boolean;
  currentItemId?: number;
}

export function ItemSelectionDialog({
  isOpen,
  onClose,
  items,
  categories,
  selectedCategoryId,
  onSelectItem,
  isLoading = false,
  currentItemId,
}: ItemSelectionDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // Filter items by selected category and search query
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by category
    if (selectedCategoryId) {
      result = result.filter((item) => item.categoryId === selectedCategoryId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.itemName.toLowerCase().includes(query) ||
          item.serialNumber?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query),
      );
    }

    return result;
  }, [items, selectedCategoryId, searchQuery]);

  const handleSelectItem = (item: Item) => {
    const isAvailable = item.status === "AVAILABLE";
    const isCurrent = currentItemId && item.id === currentItemId;
    const hasImage = !!(item.latestImage || item.image);
    if ((isAvailable || isCurrent) && hasImage) {
      onSelectItem(item);
      onClose();
      setSearchQuery(""); // Reset search on close
    }
  };

  const handleClose = () => {
    onClose();
    setSearchQuery(""); // Reset search on close
  };

  const getCategoryName = (categoryId: number | null | undefined) => {
    if (!categoryId) return "N/A";
    return categories.find((c) => c.id === categoryId)?.name || "Unknown";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Available
          </span>
        );
      case "ISSUED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Issued
          </span>
        );
      case "MISSING":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Missing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Select Item"
        size="3xl"
        overlayClassName="z-[1100] flex items-center justify-center pt-0" // Center the dialog
        contentScroll={true} // Enable scroll
      >
        <div className="flex flex-col max-h-[70vh]">
          {" "}
          {/* Constrain height to enable scroll within container */}
          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-secondary-200 bg-secondary-50 sticky top-0 z-20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by item name, serial number, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>
          </div>
          {/* Table Container */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {" "}
            {/* Enable Y scroll */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-primary-600">
                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                <p className="text-secondary-600 font-medium tracking-wide">
                  Fetching available items...
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-secondary-500">
                <AlertCircle className="w-12 h-12 mb-3 text-secondary-400" />
                <p className="text-lg font-medium">No items found</p>
                <p className="text-sm">
                  Try adjusting your search or select a different category
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-[-17px] bg-white border-b-2 border-secondary-200 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Serial Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-700 uppercase tracking-wider w-[80px]">
                      {" "}
                      {/* Fixed width for image column */}
                      Image
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200">
                  {filteredItems.map((item) => {
                    const isAvailable = item.status === "AVAILABLE";
                    const isCurrent = currentItemId && item.id === currentItemId;
                    const hasImage = !!(item.latestImage || item.image);
                    const isSelectable = (isAvailable || isCurrent) && hasImage;

                    const baseImage = item.latestImage || item.image;
                    const imageUrl = baseImage
                      ? baseImage.startsWith("/")
                        ? `${API_BASE}${baseImage}`
                        : `${API_BASE}/storage/${baseImage}`
                      : null;

                    return (
                      <tr
                        key={item.id}
                        tabIndex={isSelectable ? 0 : -1}
                        role="button"
                        aria-disabled={!isSelectable}
                        aria-label={`Select item ${item.itemName} (${item.serialNumber || "No serial number"})`}
                        onClick={() => isSelectable && handleSelectItem(item)}
                        onKeyDown={(e) => {
                          if (isSelectable && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault();
                            handleSelectItem(item);
                          }
                        }}
                        className={cn(
                          "transition-colors outline-none",
                          isSelectable
                            ? "hover:bg-primary-50 focus:bg-primary-50 focus:ring-2 focus:ring-inset focus:ring-primary-500 cursor-pointer"
                            : "bg-secondary-50 opacity-60 cursor-not-allowed",
                        )}
                      >
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              isSelectable
                                ? "text-secondary-900"
                                : "text-secondary-500",
                            )}
                          >
                            {item.serialNumber || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                isSelectable
                                  ? "text-secondary-900"
                                  : "text-secondary-500",
                              )}
                            >
                              {item.itemName}
                            </span>
                            {item.description && (
                              <span className="text-xs text-secondary-500 mt-0.5 line-clamp-1">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-sm",
                              isSelectable
                                ? "text-secondary-700"
                                : "text-secondary-500",
                            )}
                          >
                            {getCategoryName(item.categoryId)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end">
                            <div className="relative group w-14 h-14">
                              {" "}
                              {/* Fixed container size matching image */}
                              {imageUrl ? (
                                <div className="relative w-full h-full">
                                  {" "}
                                  {/* Full size of parent */}
                                  <img
                                    src={imageUrl}
                                    alt={item.itemName}
                                    className="w-full h-full object-cover rounded-lg border-2 border-secondary-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFullScreenImage(imageUrl);
                                    }}
                                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-lg transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                  >
                                    <Eye className="w-5 h-5 text-white" />
                                  </button>
                                </div>
                              ) : (
                                <div className="w-full h-full bg-secondary-100 rounded-lg flex items-center justify-center border-2 border-secondary-200">
                                  <span className="text-[10px] text-secondary-400">
                                    No Img
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {/* Footer */}
          <div className="px-6 py-4 border-t border-secondary-200 bg-secondary-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-secondary-600">
                Showing{" "}
                <span className="font-semibold">{filteredItems.length}</span>{" "}
                item(s)
              </p>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Full Screen Image Viewer */}
      {fullScreenImage && (
        <div className="relative z-[9999]">
          {" "}
          {/* Ensure highest z-index */}
          <FullScreenImageViewer
            isOpen={!!fullScreenImage}
            imageSrc={fullScreenImage}
            onClose={() => setFullScreenImage(null)}
          />
        </div>
      )}
    </>
  );
}
