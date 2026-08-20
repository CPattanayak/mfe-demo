import React, { useState } from "react";
import { useMutation } from "@apollo/client";
import { authClient } from "@demo/shared-auth";
import { PRODUCT_QUERY } from "../graphql/productQueries";
import { CREATE_INVENTORY, UPDATE_INVENTORY, DELETE_INVENTORY } from "../graphql/inventoryQueries";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";

const LOW_STOCK_THRESHOLD = 10;

/**
 * Requirement: display AND manage product inventory (from the
 * inventory-service subgraph) on the product detail page. `inventory`
 * arrives as part of the SAME PRODUCT_QUERY response as name/price/sku —
 * federated in by Apollo Router — but mutations (create/update/delete)
 * are separate requests to inventory-service, refetching PRODUCT_QUERY
 * afterward the same way ProductForm's own save does.
 *
 * Gated behind product:write, same as the rest of this page — ProductEdit.jsx
 * already blocks the WHOLE page for users without that role, so this
 * check is technically redundant there, but kept local too since this
 * component has no guarantee of always being used inside that guard.
 */
export default function InventorySection({ inventory, productId }) {
  const canWrite = authClient.hasRole("product:write");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ quantityAvailable: 0, quantityReserved: 0, warehouseLocation: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDraft, setAddDraft] = useState({ quantityAvailable: 0, quantityReserved: 0, warehouseLocation: "" });

  const refetchQueries = [{ query: PRODUCT_QUERY, variables: { id: productId } }];

  const [createInventory, { loading: creating, error: createError }] = useMutation(CREATE_INVENTORY, {
    refetchQueries,
    onCompleted: () => {
      setShowAddForm(false);
      setAddDraft({ quantityAvailable: 0, quantityReserved: 0, warehouseLocation: "" });
    },
  });

  const [updateInventory, { loading: updating, error: updateError }] = useMutation(UPDATE_INVENTORY, {
    refetchQueries,
    onCompleted: () => setEditingId(null),
  });

  const [deleteInventory, { error: deleteError }] = useMutation(DELETE_INVENTORY, { refetchQueries });

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditDraft({
      quantityAvailable: row.quantityAvailable,
      quantityReserved: row.quantityReserved,
      warehouseLocation: row.warehouseLocation ?? "",
    });
  };

  const saveEdit = (id) => {
    updateInventory({ variables: { id, input: editDraft } });
  };

  const mutationError = createError || updateError || deleteError;

  if ((!inventory || inventory.length === 0) && !showAddForm) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
        <Alert severity="info" sx={{ mb: canWrite ? 2 : 0 }}>
          No inventory records for this product yet.
        </Alert>
        {canWrite && (
          <AddWarehouseForm
            draft={addDraft}
            onChange={setAddDraft}
            onCancel={null}
            onSubmit={() =>
              createInventory({
                variables: { input: { productId, ...addDraft } },
              })
            }
            submitting={creating}
          />
        )}
      </Paper>
    );
  }

  const totalAvailable = inventory.reduce((sum, row) => sum + row.quantityAvailable, 0);
  const totalReserved = inventory.reduce((sum, row) => sum + row.quantityReserved, 0);
  const anyLowStock = inventory.some((row) => row.quantityAvailable < LOW_STOCK_THRESHOLD);

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle1">
          Inventory — {totalAvailable} available across {inventory.length}{" "}
          {inventory.length === 1 ? "warehouse" : "warehouses"}
        </Typography>
        {anyLowStock && <Chip label="Low stock somewhere" size="small" color="warning" />}
      </Box>

      {mutationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {mutationError.message}
        </Alert>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Warehouse</TableCell>
            <TableCell align="right">Available</TableCell>
            <TableCell align="right">Reserved</TableCell>
            <TableCell>Last restocked</TableCell>
            {canWrite && <TableCell align="right" />}
          </TableRow>
        </TableHead>
        <TableBody>
          {inventory.map((row) => {
            const isLowStock = row.quantityAvailable < LOW_STOCK_THRESHOLD;
            const isEditing = editingId === row.id;

            if (isEditing) {
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <TextField
                      size="small"
                      value={editDraft.warehouseLocation}
                      onChange={(e) => setEditDraft({ ...editDraft, warehouseLocation: e.target.value })}
                      sx={{ width: 130 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={editDraft.quantityAvailable}
                      onChange={(e) => setEditDraft({ ...editDraft, quantityAvailable: Number(e.target.value) })}
                      sx={{ width: 90 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={editDraft.quantityReserved}
                      onChange={(e) => setEditDraft({ ...editDraft, quantityReserved: Number(e.target.value) })}
                      sx={{ width: 90 }}
                    />
                  </TableCell>
                  <TableCell>{formatDate(row.lastRestockedAt)}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary" disabled={updating} onClick={() => saveEdit(row.id)}>
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setEditingId(null)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            }

            return (
              <TableRow key={row.id} hover>
                <TableCell>{row.warehouseLocation ?? "—"}</TableCell>
                <TableCell align="right" sx={{ fontWeight: isLowStock ? 700 : undefined }}>
                  {row.quantityAvailable}
                  {isLowStock && (
                    <Chip label="Low" size="small" color="warning" variant="outlined" sx={{ ml: 1 }} />
                  )}
                </TableCell>
                <TableCell align="right">{row.quantityReserved}</TableCell>
                <TableCell>{formatDate(row.lastRestockedAt)}</TableCell>
                {canWrite && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => startEdit(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => deleteInventory({ variables: { id: row.id } })}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
          {inventory.length > 1 && (
            <TableRow>
              <TableCell sx={{ fontWeight: 700, borderTop: "2px solid", borderColor: "divider" }}>
                Total
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, borderTop: "2px solid", borderColor: "divider" }}>
                {totalAvailable}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, borderTop: "2px solid", borderColor: "divider" }}>
                {totalReserved}
              </TableCell>
              <TableCell sx={{ borderTop: "2px solid", borderColor: "divider" }} />
              {canWrite && <TableCell sx={{ borderTop: "2px solid", borderColor: "divider" }} />}
            </TableRow>
          )}
        </TableBody>
      </Table>

      {canWrite && !showAddForm && (
        <Button startIcon={<AddIcon />} onClick={() => setShowAddForm(true)} sx={{ mt: 2 }}>
          Add warehouse
        </Button>
      )}
      {canWrite && showAddForm && (
        <AddWarehouseForm
          draft={addDraft}
          onChange={setAddDraft}
          onCancel={() => setShowAddForm(false)}
          onSubmit={() => createInventory({ variables: { input: { productId, ...addDraft } } })}
          submitting={creating}
        />
      )}
    </Paper>
  );
}

function AddWarehouseForm({ draft, onChange, onCancel, onSubmit, submitting }) {
  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end", mt: 2, flexWrap: "wrap" }}>
      <TextField
        label="Warehouse"
        size="small"
        value={draft.warehouseLocation}
        onChange={(e) => onChange({ ...draft, warehouseLocation: e.target.value })}
        sx={{ width: 150 }}
      />
      <TextField
        label="Available"
        size="small"
        type="number"
        value={draft.quantityAvailable}
        onChange={(e) => onChange({ ...draft, quantityAvailable: Number(e.target.value) })}
        sx={{ width: 100 }}
      />
      <TextField
        label="Reserved"
        size="small"
        type="number"
        value={draft.quantityReserved}
        onChange={(e) => onChange({ ...draft, quantityReserved: Number(e.target.value) })}
        sx={{ width: 100 }}
      />
      <Button
        variant="contained"
        size="small"
        disabled={submitting || !draft.warehouseLocation}
        onClick={onSubmit}
      >
        {submitting ? "Adding…" : "Add"}
      </Button>
      {onCancel && (
        <Button size="small" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </Box>
  );
}

function formatDate(isoString) {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}
