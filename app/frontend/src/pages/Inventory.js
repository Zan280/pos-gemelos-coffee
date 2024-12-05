import React, { useState, useEffect} from "react";
import axiosInstance from "../axiosConfig";

const Inventory = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        //Solicita los datos del backend
        axiosInstance.get("products/")
        .then((response)=> {
            console.log(response.data);
            setProducts(response.data);
        })
        .catch((error) => {
            console.error("Hubo un error al obtener los productos:", error);
        });
    }, []);

    return (
        <div className="container">
            <h1>Inventory</h1>
            <ul className="product-list">
                {products.map((product) => (
                    <li key={product.id} className="product-item">
                        <span>{product.name}</span> - {product.stock} in stock
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Inventory;